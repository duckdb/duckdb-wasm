import { DuckDBModule, WasmHash } from './duckdb_module';
import { DuckDBBindingsBase } from './bindings_base';
import { DuckDBRuntime } from './runtime';
import { LogLevel, LogTopic, LogOrigin, LogEvent } from '../log';
import { Logger } from '../log';
import { InstantiationProgress } from '.';

/** DuckDB bindings for the browser */
export abstract class DuckDBBrowserBindings extends DuckDBBindingsBase {
    /** The path of the wasm module */
    protected readonly mainModuleURL: string;
    /** The path of the pthread worker script */
    protected readonly pthreadWorkerURL: string | null;

    /** Constructor */
    public constructor(logger: Logger, runtime: DuckDBRuntime, mainModuleURL: string, pthreadWorkerURL: string | null) {
        super(logger, runtime);
        this.mainModuleURL = mainModuleURL;
        this.pthreadWorkerURL = pthreadWorkerURL;
    }

    /** Locate a file */
    protected locateFile(path: string, prefix: string): string {
        if (path.endsWith('.wasm')) {
            return this.mainModuleURL;
        }
        if (path.endsWith('.worker.js')) {
            if (!this.pthreadWorkerURL) {
                throw new Error('Missing DuckDB worker URL!');
            }
            return this.pthreadWorkerURL!;
        }
        throw new Error(`WASM instantiation requested unexpected file: prefix=${prefix} path=${path}`);
    }

    /** Run the Emscripten factory with our own file lookup and wasm instantiation */
    protected instantiateModule(
        factory: (moduleOverrides: Partial<DuckDBModule>) => Promise<DuckDBModule>,
        moduleOverrides: Partial<DuckDBModule>,
    ): Promise<DuckDBModule> {
        // Emscripten gives `instantiateWasm()` no way to report a failure, so the factory would never settle.
        let fail: (error: Error) => void = () => {};
        const failed = new Promise<never>((_, reject) => {
            fail = reject;
        });
        // Emscripten sets `wasmHash` on this very object before it calls `instantiateWasm()`.
        const module: Partial<DuckDBModule> = {
            ...moduleOverrides,
            locateFile: this.locateFile.bind(this),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (module as any).instantiateWasm = (imports: any, success: any) =>
            this.instantiateWasm(imports, success, module.wasmHash, fail);
        return Promise.race([factory(module), failed]);
    }

    /** Log a Cross-Origin Storage event */
    protected logCOS(level: LogLevel, value: string): void {
        this.logger.log({
            timestamp: new Date(),
            level,
            origin: LogOrigin.BINDINGS,
            topic: LogTopic.INSTANTIATE,
            event: level == LogLevel.ERROR ? LogEvent.ERROR : LogEvent.OK,
            value: `Cross-Origin Storage: ${value}`,
        });
    }

    /** Fetch the wasm module from Cross-Origin Storage, or from the network if it is not stored there */
    protected async fetchWasm(wasmHash?: WasmHash): Promise<Response> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cos = (globalThis.navigator as any)?.crossOriginStorage;
        if (!wasmHash || typeof cos?.getFileHandle !== 'function') {
            return fetch(new Request(this.mainModuleURL));
        }
        const hash = { algorithm: wasmHash.algorithm, value: wasmHash.value };
        try {
            const handle = await cos.getFileHandle(hash);
            const file: File = await handle.getFile();
            this.logCOS(LogLevel.INFO, `loaded ${hash.value}`);
            // Stored files carry no reliable type, and streaming compilation insists on `application/wasm`.
            return new Response(file.stream(), {
                headers: { 'Content-Type': 'application/wasm', 'Content-Length': String(file.size) },
            });
        } catch (e: any) {
            if (e?.name !== 'NotFoundError') {
                this.logCOS(LogLevel.WARNING, `lookup failed, using the network: ${e}`);
                return fetch(new Request(this.mainModuleURL));
            }
        }
        // Not stored yet: compile from the network and store a copy of the same bytes on the side.
        const response = await fetch(new Request(this.mainModuleURL));
        if (!response.ok || !response.body) {
            return response;
        }
        const [body, copy] = response.body.tee();
        const store = async () => {
            try {
                // Any origin may read the stored copy, since DuckDB ships the same binary to every site that
                // loads it. Emscripten's `-sCROSS_ORIGIN_STORAGE_ORIGINS` only reaches its own loader, which this
                // one replaces, so it has no effect here.
                const handle = await cos.getFileHandle(hash, { create: true, origins: '*' });
                const writable = await handle.createWritable();
                // `pipeTo()` closes the writable at the end, which is where COS verifies the hash.
                await copy.pipeTo(writable);
                this.logCOS(LogLevel.INFO, `stored ${hash.value}`);
            } catch (e: any) {
                // An unread branch would buffer the whole module in memory.
                copy.cancel().catch(() => {});
                this.logCOS(LogLevel.WARNING, `storing failed: ${e}`);
            }
        };
        store();
        return new Response(body, response);
    }

    /** Instantiate the wasm module */
    protected instantiateWasm(
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        imports: any,
        success: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void,
        wasmHash?: WasmHash,
        fail: (error: Error) => void = () => {},
    ): Emscripten.WebAssemblyExports {
        // We rely on the following here:
        //
        // ...when a Request object is created using the Request.Request constructor,
        // the value of the mode property for that Request is set to cors.
        // [ref: MDN]
        //
        // Cloudflare throws when mode: 'cors' is set
        //
        globalThis.DUCKDB_RUNTIME = this._runtime;
        const handlers = this.onInstantiationProgress;
        const onError = (prefix: string) => (error: any) => {
            this.logger.log({
                timestamp: new Date(),
                level: LogLevel.ERROR,
                origin: LogOrigin.BINDINGS,
                topic: LogTopic.INSTANTIATE,
                event: LogEvent.ERROR,
                value: prefix + error,
            });
            fail(error instanceof Error ? error : new Error(String(error)));
        };

        // Does the browser support streaming instantiation?
        if (WebAssembly.instantiateStreaming) {
            // Does the browser support transform streams?
            if (typeof TransformStream === 'function') {
                const fetchWithProgress = async () => {
                    // Try to determine file size
                    const response = await this.fetchWasm(wasmHash);
                    const contentLengthHdr = response.headers.get('content-length');
                    const contentLength = contentLengthHdr ? parseInt(contentLengthHdr, 10) || 0 : 0;

                    // Transform the stream
                    const start = new Date();
                    const progress: InstantiationProgress = {
                        startedAt: start,
                        updatedAt: start,
                        bytesTotal: contentLength || 0,
                        bytesLoaded: 0,
                    };
                    const tracker = {
                        transform(chunk: any, ctrl: TransformStreamDefaultController) {
                            progress.bytesLoaded += chunk.byteLength;
                            const now = new Date();
                            if (now.getTime() - progress.updatedAt.getTime() < 20) {
                                progress.updatedAt = now;
                                ctrl.enqueue(chunk);
                                return;
                            }
                            for (const p of handlers) {
                                p(progress);
                            }
                            ctrl.enqueue(chunk);
                        },
                    };
                    const ts = new TransformStream(tracker);
                    return new Response(response.body?.pipeThrough(ts), response);
                };
                // Instantiate streaming
                const response = fetchWithProgress();
                WebAssembly.instantiateStreaming(response, imports).then(output => {
                    success(output.instance, output.module);
                }, onError('Failed to instantiate WASM: '));
            } else {
                console.warn('instantiating without progress handler since transform streams are unavailable');
                WebAssembly.instantiateStreaming(this.fetchWasm(wasmHash), imports).then(output => {
                    success(output.instance, output.module);
                }, onError('Failed to instantiate WASM: '));
            }
        } else if (typeof XMLHttpRequest == 'function') {
            // Otherwise we fall back to XHRs
            const xhr = new XMLHttpRequest();
            const url = this.mainModuleURL;
            const start = new Date();
            const progress: InstantiationProgress = {
                startedAt: start,
                updatedAt: start,
                bytesTotal: 0,
                bytesLoaded: 0,
            };
            xhr.open('GET', url);
            xhr.responseType = 'arraybuffer';
            xhr.onerror = onError('Failed to load WASM: ');
            xhr.onprogress = e => {
                progress.bytesTotal = e.total;
                progress.bytesLoaded = e.loaded;
                const now = new Date();
                if (now.getTime() - progress.updatedAt.getTime() < 20) {
                    progress.updatedAt = now;
                    return;
                }
                for (const p of handlers) {
                    p(progress);
                }
            };
            xhr.onload = () => {
                WebAssembly.instantiate(xhr.response, imports)
                    .then(output => {
                        success(output.instance, output.module);
                    })
                    .catch(onError('Failed to instantiate WASM: '));
            };
            xhr.send();
        } else {
            console.warn('instantiating with manual fetch since streaming instantiation and xhrs are unavailable');
            const run = async () => {
                const request = new Request(this.mainModuleURL);
                const response = await fetch(request);
                const buffer = await response.arrayBuffer();
                const output = await WebAssembly.instantiate(buffer, imports);
                success(output.instance, output.module);
            };
            run().catch(onError('Failed to instantiate WASM: '));
        }
        return [];
    }

    /// Instantiation must be done by the browser variants
    protected abstract instantiateImpl(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule>;
}
