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
            // Hand the fetch() Response to instantiateStreaming untouched: browsers only
            // code-cache modules compiled from a Response that came straight from fetch().
            // Progress is counted on a clone, and only if someone is listening.
            const fetchWasm = async () => {
                const request = new Request(this.mainModuleURL);
                const response = await fetch(request);
                if (handlers.length > 0) {
                    this.trackProgress(response, handlers);
                }
                return response;
            };
            WebAssembly.instantiateStreaming(fetchWasm(), imports).then(output => {
                success(output.instance, output.module);
            });
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
                    return;
                }
                progress.updatedAt = now;
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

    /** Report download progress by reading a clone of the wasm response */
    protected trackProgress(response: Response, handlers: ((p: InstantiationProgress) => void)[]): void {
        let body: ReadableStream<Uint8Array> | null = null;
        try {
            body = response.clone().body;
        } catch (e) {
            return;
        }
        if (!body) {
            return;
        }
        // Content-Length is the encoded size, while the stream yields decoded bytes.
        // Only trust it for unencoded responses; 0 means the total is unknown.
        const contentLengthHdr = response.headers.get('content-length');
        const encoded = !!response.headers.get('content-encoding');
        const start = new Date();
        const progress: InstantiationProgress = {
            startedAt: start,
            updatedAt: start,
            bytesTotal: encoded || !contentLengthHdr ? 0 : parseInt(contentLengthHdr, 10) || 0,
            bytesLoaded: 0,
        };
        const reader = body.getReader();
        const read = async () => {
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                progress.bytesLoaded += value.byteLength;
                // Cross-origin responses may hide Content-Encoding
                if (progress.bytesLoaded > progress.bytesTotal) {
                    progress.bytesTotal = 0;
                }
                const now = new Date();
                if (now.getTime() - progress.updatedAt.getTime() < 20) {
                    continue;
                }
                progress.updatedAt = now;
                for (const p of handlers) {
                    p(progress);
                }
            }
            progress.updatedAt = new Date();
            for (const p of handlers) {
                p(progress);
            }
        };
        read().catch(() => {});
    }

    /// Instantiation must be done by the browser variants
    protected abstract instantiateImpl(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule>;
}
