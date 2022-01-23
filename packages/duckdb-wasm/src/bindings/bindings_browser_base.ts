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
        globalThis.DUCKDB_RUNTIME = this._runtime;
        const handlers = this.onInstantiationProgress;
        const state = {
            lastEvent: new Date(),
        };

        // Does the browser support transform streams?
        if (typeof TransformStream === 'function' && ReadableStream.prototype.pipeThrough) {
            // We rely on the following here:
            //
            // ...when a Request object is created using the Request.Request constructor,
            // the value of the mode property for that Request is set to cors.
            // [ref: MDN]
            //
            // Cloudflare throws when mode: 'cors' is set
            //
            const fetchWithProgress = async () => {
                // Try to determine file size
                const request = new Request(this.mainModuleURL);
                const response = await fetch(request);

                // Try to get content length either through header or separate HEAD request
                const contentLengthHdr = response.headers.get('Content-Length');
                let contentLength: number | null;
                if (contentLengthHdr) {
                    contentLength = parseInt(contentLengthHdr, 10) || 0;
                } else {
                    contentLength = await new Promise((resolve, _reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.open('HEAD', this.mainModuleURL, true);
                        xhr.onreadystatechange = () => {
                            if (xhr.readyState == xhr.DONE) {
                                const l = xhr.getResponseHeader('Content-Length');
                                return l ? resolve(parseInt(l)) : resolve(null);
                            }
                        };
                        xhr.onerror = _e => resolve(null);
                        xhr.send();
                    });
                }

                // Transform the stream
                const progress: InstantiationProgress = {
                    startedAt: new Date(),
                    bytesTotal: contentLength || 0,
                    bytesLoaded: 0,
                };
                const ts = new TransformStream({
                    transform(chunk, ctrl) {
                        progress.bytesLoaded += chunk.byteLength;
                        // Emit events every 100 ms
                        const now = new Date();
                        if (now.getTime() - state.lastEvent.getTime() < 100) {
                            state.lastEvent = now;
                            ctrl.enqueue(chunk);
                            return;
                        }
                        // Call all progress handlers
                        for (const p of handlers) {
                            p(progress);
                        }
                        ctrl.enqueue(chunk);
                    },
                });

                return new Response(response.body?.pipeThrough(ts), response);
            };
            const response = fetchWithProgress();

            // Browser supports streaming instantiation?
            if (WebAssembly.instantiateStreaming) {
                WebAssembly.instantiateStreaming(response, imports).then(output => {
                    success(output.instance, output.module);
                });
            } else {
                // Otherwise download as array buffer
                response
                    .then(resp => resp.arrayBuffer())
                    .then(bytes =>
                        WebAssembly.instantiate(bytes, imports)
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
                            }),
                    )
                    .catch(error => {
                        this.logger.log({
                            timestamp: new Date(),
                            level: LogLevel.ERROR,
                            origin: LogOrigin.BINDINGS,
                            topic: LogTopic.INSTANTIATE,
                            event: LogEvent.ERROR,
                            value: 'Failed to load WASM: ' + error,
                        });
                        throw new Error(error);
                    });
            }
        } else {
            // Otherwise we fall back to XHRs
            const xhr = new XMLHttpRequest();
            const url = this.mainModuleURL;
            const progress: InstantiationProgress = {
                startedAt: new Date(),
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
        }
        return [];
    }

    /// Instantiation must be done by the browser variants
    protected abstract instantiateImpl(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule>;
}
