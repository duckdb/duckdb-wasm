/**
 * Experimental WebWorker for DuckDB wire-format API.
 *
 * Loads the duckdb-wasm binary and exposes the experimental exports
 * (varchar-cast results in wire binary format) via postMessage.
 *
 * Main thread sends: { op, tag, ...params }
 * Worker responds:   { tag, status, data?, error? }
 *
 * All long-running operations are incremental:
 * - send_query starts execution, returns metadata when ready or null if still executing
 * - poll_pending_query advances execution one step, returns metadata or null
 * - fetch returns one batch of chunks at a time
 * This keeps the event loop free so interrupt messages can be processed between steps.
 */

import { DuckDB } from '../bindings/bindings_browser_eh';
import { BROWSER_RUNTIME } from '../bindings/runtime_browser';
import { DuckDBModule } from '../bindings/duckdb_module';
import { LogEvent } from '../log';
import { InstantiationProgress } from '../bindings/progress';

// === Helpers ===

function callSRet(
    mod: DuckDBModule,
    funcName: string,
    argTypes: Array<Emscripten.JSType>,
    args: Array<any>,
): [number, number, number] {
    const stackPointer = mod.stackSave();
    const response = mod.stackAlloc(3 * 8);
    argTypes.unshift('number');
    args.unshift(response);
    mod.ccall(funcName, null, argTypes, args);
    const status = mod.HEAPF64[(response >> 3) + 0];
    const data = mod.HEAPF64[(response >> 3) + 1];
    const dataSize = mod.HEAPF64[(response >> 3) + 2];
    mod.stackRestore(stackPointer);
    return [status, data, dataSize];
}

function copyBuffer(mod: DuckDBModule, ptr: number, length: number): Uint8Array {
    const buffer = mod.HEAPU8.subarray(ptr, ptr + length);
    const copy = new Uint8Array(new ArrayBuffer(buffer.byteLength));
    copy.set(buffer);
    return copy;
}

function dropResponseBuffers(mod: DuckDBModule): void {
    mod.ccall('duckdb_web_clear_response', null, [], []);
}

// === Worker state ===

let mod: DuckDBModule | null = null;
let connHdl: number = 0;

// === Message types ===

interface WorkerRequest {
    op: string;
    tag: number;
    sql?: string;
    castMode?: number;
    chunkIdx?: number;
    mainModuleURL?: string;
    config?: string;
    fileName?: string;
    buffer?: Uint8Array;
}

// === Response ===

function respond(tag: number, status: number, data: Uint8Array | null, error?: string, duration?: number): void {
    const msg: any = { tag, status };
    if (duration !== undefined) msg.duration = duration;
    if (data) {
        msg.data = data;
        globalThis.postMessage(msg, [data.buffer]);
    } else {
        if (error) msg.error = error;
        globalThis.postMessage(msg);
    }
}

/** Call an experimental export — always measures duration */
function callExperimental(funcName: string, argTypes: Emscripten.JSType[], args: any[]): { data: Uint8Array | null, duration: number } {
    const t0 = performance.now();
    const [, d, n] = callSRet(mod!, funcName, argTypes, args);
    const data = (n > 0) ? copyBuffer(mod!, d, n) : null;
    dropResponseBuffers(mod!);
    return { data, duration: performance.now() - t0 };
}

// === Message handler ===

async function handleMessage(req: WorkerRequest): Promise<void> {
    const { op, tag } = req;

    try {
        switch (op) {
            case 'instantiate': {
                const bindings = new DuckDB(
                    { log: (_event: LogEvent) => {} } as any,
                    BROWSER_RUNTIME,
                    req.mainModuleURL!,
                    null,
                );
                await bindings.instantiate((_p: InstantiationProgress) => {});
                mod = (bindings as any)._instance as DuckDBModule;
                respond(tag, 0, null);
                break;
            }

            case 'open': {
                callSRet(mod!, 'duckdb_web_open', ['string'], [req.config || '']);
                dropResponseBuffers(mod!);
                respond(tag, 0, null);
                break;
            }

            case 'connect': {
                connHdl = mod!.ccall('duckdb_web_connect', 'number', [], []);
                respond(tag, 0, null);
                break;
            }

            case 'disconnect': {
                mod!.ccall('duckdb_web_disconnect', null, ['number'], [connHdl]);
                connHdl = 0;
                respond(tag, 0, null);
                break;
            }

            // Materialized query — non-blocking via query_start + query_poll.
            // Polls with MessageChannel between steps so interrupts can be processed.
            case 'query': {
                let totalDuration = 0;
                const start = callExperimental(
                    'duckdb_web_experimental_query_start',
                    ['number', 'string', 'number'],
                    [connHdl, req.sql!, req.castMode ?? 0],
                );
                totalDuration += start.duration;
                if (start.data) {
                    respond(tag, 0, start.data, undefined, totalDuration);
                } else {
                    const ch = new MessageChannel();
                    ch.port1.onmessage = () => {
                        const poll = callExperimental(
                            'duckdb_web_experimental_query_poll',
                            ['number'],
                            [connHdl],
                        );
                        totalDuration += poll.duration;
                        if (poll.data) {
                            respond(tag, 0, poll.data, undefined, totalDuration);
                            ch.port1.close();
                        } else {
                            ch.port2.postMessage(null);
                        }
                    };
                    ch.port2.postMessage(null);
                }
                break;
            }

            case 'send_query': {
                const r = callExperimental(
                    'duckdb_web_experimental_send_query',
                    ['number', 'string', 'number'],
                    [connHdl, req.sql!, req.castMode ?? 0],
                );
                respond(tag, 0, r.data, undefined, r.duration);
                break;
            }

            case 'poll_pending_query': {
                const r = callExperimental(
                    'duckdb_web_experimental_poll_pending_query',
                    ['number'],
                    [connHdl],
                );
                respond(tag, 0, r.data, undefined, r.duration);
                break;
            }

            case 'fetch': {
                const r = callExperimental(
                    'duckdb_web_experimental_fetch',
                    ['number'],
                    [connHdl],
                );
                respond(tag, 0, r.data, undefined, r.duration);
                break;
            }

            case 'fetch_chunk_at': {
                const r = callExperimental(
                    'duckdb_web_experimental_fetch_chunk_at',
                    ['number', 'number'],
                    [connHdl, req.chunkIdx ?? 0],
                );
                respond(tag, 0, r.data, undefined, r.duration);
                break;
            }

            // Fire-and-forget interrupt — cancels the pending query.
            // Non-blocking, returns immediately.
            case 'interrupt': {
                mod!.ccall('duckdb_web_experimental_interrupt', null, ['number'], [connHdl]);
                respond(tag, 0, null);
                break;
            }

            case 'clear_interrupt': {
                mod!.ccall('duckdb_web_experimental_clear_interrupt', null, ['number'], [connHdl]);
                respond(tag, 0, null);
                break;
            }

            case 'register_file': {
                const buf = req.buffer!;
                const ptr = mod!._malloc(buf.length);
                mod!.HEAPU8.set(buf, ptr);
                callSRet(mod!, 'duckdb_web_fs_register_file_buffer', ['string', 'number', 'number'],
                    [req.fileName!, ptr, buf.length]);
                dropResponseBuffers(mod!);
                respond(tag, 0, null);
                break;
            }

            case 'list_files': {
                const [, d, n] = callSRet(mod!, 'duckdb_web_fs_glob_file_infos', ['string'], ['*']);
                const json = new TextDecoder().decode(mod!.HEAPU8.subarray(d, d + n));
                dropResponseBuffers(mod!);
                respond(tag, 0, new TextEncoder().encode(json));
                break;
            }

            case 'download_file': {
                const [s, d, n] = callSRet(mod!, 'duckdb_web_copy_file_to_buffer', ['string'], [req.fileName!]);
                console.log('[download_file] status=' + s + ' data_ptr=' + d + ' size=' + n);
                if (s !== 0) {
                    const errMsg = (n > 0) ? new TextDecoder().decode(mod!.HEAPU8.subarray(d, d + n)) : 'unknown error';
                    dropResponseBuffers(mod!);
                    respond(tag, 1, null, errMsg);
                } else {
                    const data = (n > 0) ? copyBuffer(mod!, d, n) : null;
                    dropResponseBuffers(mod!);
                    respond(tag, 0, data);
                }
                break;
            }

            case 'drop_file': {
                callSRet(mod!, 'duckdb_web_fs_drop_file', ['string'], [req.fileName!]);
                dropResponseBuffers(mod!);
                respond(tag, 0, null);
                break;
            }

            case 'drop_files': {
                callSRet(mod!, 'duckdb_web_fs_drop_files', [], []);
                dropResponseBuffers(mod!);
                respond(tag, 0, null);
                break;
            }

            default:
                respond(tag, 1, null, `unknown op: ${op}`);
        }
    } catch (e: any) {
        respond(tag, 1, null, e.message || String(e));
    }
}

// === Register ===

globalThis.onmessage = async (event: MessageEvent<WorkerRequest>) => {
    await handleMessage(event.data);
};
