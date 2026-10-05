import { DuckDBModule } from './duckdb_module';
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

    /** Instantiate the wasm module */
    protected instantiateWasm(
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        imports: any,
        success: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void,
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

        // Does the browser support streaming instantiation?
        if (WebAssembly.instantiateStreaming) {
            // Does the browser support transform streams?
            if (typeof TransformStream === 'function') {
                const fetchWithProgress = async () => {
                    // Try to determine file size
                    const request = new Request(this.mainModuleURL);
                    const response = await fetch(request);
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
                });
            } else {
                console.warn('instantiating without progress handler since transform streams are unavailable');
                const request = new Request(this.mainModuleURL);
                WebAssembly.instantiateStreaming(fetch(request), imports).then(output => {
                    success(output.instance, output.module);
                });
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
            xhr.onerror = error => {
                this.logger.log({
                    timestamp: new Date(),
                    level: LogLevel.ERROR,
                    origin: LogOrigin.BINDINGS,
                    topic: LogTopic.INSTANTIATE,
                    event: LogEvent.ERROR,
                    value: 'Failed to load WASM: ' + error,
                });
                throw new Error(error.toString());
            };
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
                    .catch(error => {
                        this.logger.log({
                            timestamp: new Date(),
                            level: LogLevel.ERROR,
                            origin: LogOrigin.BINDINGS,
                            topic: LogTopic.INSTANTIATE,
                            event: LogEvent.ERROR,
                            value: 'Failed to instantiate WASM: ' + error,
                        });
                        throw new Error(error);
                    });
            };
            xhr.send();
        } else {
            console.warn('instantiating with manual fetch since streaming instantiation and xhrs are unavailable');
            const run = async () => {
                const request = new Request(this.mainModuleURL);
                const response = await fetch(request);
                const buffer = await response.arrayBuffer();
                WebAssembly.instantiate(buffer, imports).then(output => {
                    success(output.instance, output.module);
                });
            };
            run();
        }
        return [];
    }

    /// Instantiation must be done by the browser variants
    protected abstract instantiateImpl(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule>;
}
