import { DuckDBBindings } from '../bindings';
import { ZipBindings } from '../plugins/zip_bindings';
import { WorkerResponseVariant, WorkerRequestVariant, WorkerRequestType, WorkerResponseType } from './worker_request';
import { Logger, LogEntryVariant } from '../log';

export abstract class AsyncDuckDBDispatcher implements Logger {
    /** The bindings */
    protected _bindings: DuckDBBindings | null = null;
    /** The zip bindings */
    protected _zip: ZipBindings | null = null;
    /** The next message id */
    protected _nextMessageId = 0;

    /** Instantiate the wasm module */
    protected abstract open(path: string): Promise<DuckDBBindings>;
    /** Post a response to the main thread */
    protected abstract postMessage(response: WorkerResponseVariant, transfer: ArrayBuffer[]): void;

    /** Send log entry to the main thread */
    public log(entry: LogEntryVariant): void {
        this.postMessage(
            {
                messageId: this._nextMessageId++,
                requestId: 0,
                type: WorkerResponseType.LOG,
                data: entry,
            },
            [],
        );
    }

    /** Send plain OK without further data */
    protected sendOK(request: WorkerRequestVariant): void {
        this.postMessage(
            {
                messageId: this._nextMessageId++,
                requestId: request.messageId,
                type: WorkerResponseType.OK,
                data: null,
            },
            [],
        );
    }

    /** Fail with an error */
    protected failWith(request: WorkerRequestVariant, e: Error): void {
        // Workaround for Firefox not being able to perform structured-clone on Native Errors
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1556604
        const obj: any = {
            name: e.name,
            message: e.message,
            stack: e.stack || undefined,
        };
        this.postMessage(
            {
                messageId: this._nextMessageId++,
                requestId: request.messageId,
                type: WorkerResponseType.ERROR,
                data: obj,
            },
            [],
        );
        return;
    }

    /** Process a request from the main thread */
    public async onMessage(request: WorkerRequestVariant): Promise<void> {
        // First process those requests that don't need bindings
        switch (request.type) {
            case WorkerRequestType.PING:
                this.sendOK(request);
                return;
            case WorkerRequestType.OPEN:
                if (this._bindings != null) {
                    this.failWith(request, new Error('duckdb already initialized'));
                }
                try {
                    this._bindings = await this.open(request.data);
                    this._zip = new ZipBindings(this._bindings); // TODO: make optional
                    this.sendOK(request);
                } catch (e) {
                    this._bindings = null;
                    this.failWith(request, e);
                }
                return;
            default:
                break;
        }

        // Bindings not initialized?
        if (!this._bindings) {
            return this.failWith(request, new Error('duckdb is not initialized'));
        }

        // Catch every exception and forward it as error message to the main thread
        try {
            switch (request.type) {
                case WorkerRequestType.GET_VERSION:
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.VERSION_STRING,
                            data: this._bindings.getVersion(),
                        },
                        [],
                    );
                    break;
                case WorkerRequestType.RESET:
                    this._bindings = null;
                    this.sendOK(request);
                    break;
                case WorkerRequestType.FLUSH_FILES:
                    this._bindings.flushFiles();
                    this.sendOK(request);
                    break;
                case WorkerRequestType.CONNECT: {
                    const conn = this._bindings.connect();
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.CONNECTION_INFO,
                            data: conn.handle,
                        },
                        [],
                    );
                    break;
                }
                case WorkerRequestType.DISCONNECT:
                    this._bindings.disconnect(request.data);
                    this.sendOK(request);
                    break;
                case WorkerRequestType.RUN_QUERY: {
                    const result = this._bindings.runQuery(request.data[0], request.data[1]);
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.QUERY_RESULT,
                            data: result,
                        },
                        [result.buffer],
                    );
                    break;
                }
                case WorkerRequestType.SEND_QUERY: {
                    const result = this._bindings.sendQuery(request.data[0], request.data[1]);
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.QUERY_START,
                            data: result,
                        },
                        [result.buffer],
                    );
                    break;
                }
                case WorkerRequestType.FETCH_QUERY_RESULTS: {
                    const result = this._bindings.fetchQueryResults(request.data);
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.QUERY_RESULT_CHUNK,
                            data: result,
                        },
                        [result.buffer],
                    );
                    break;
                }
                case WorkerRequestType.DROP_FILE: {
                    await this._bindings.dropFile(request.data);
                    this.sendOK(request);
                    break;
                }
                case WorkerRequestType.DROP_FILES: {
                    await this._bindings.dropFiles();
                    this.sendOK(request);
                    break;
                }
                case WorkerRequestType.ADD_FILE_PATH: {
                    const fileID = await this._bindings.addFilePath(request.data[0], request.data[1]);
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.REGISTERED_FILE,
                            data: fileID,
                        },
                        [],
                    );
                    break;
                }
                case WorkerRequestType.ADD_FILE_BLOB: {
                    const fileID = await this._bindings.addFileBlob(request.data[0], request.data[1]);
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.REGISTERED_FILE,
                            data: fileID,
                        },
                        [],
                    );
                    break;
                }
                case WorkerRequestType.ADD_FILE_BUFFER: {
                    const fileID = await this._bindings.addFileBuffer(request.data[0], request.data[1]);
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.REGISTERED_FILE,
                            data: fileID,
                        },
                        [],
                    );
                    break;
                }
                case WorkerRequestType.GET_FILE_OBJECT_URL:
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.FILE_OBJECT_URL,
                            data: this._bindings.getFileObjectURL(request.data),
                        },
                        [],
                    );
                    break;
                case WorkerRequestType.GET_FILE_BUFFER:
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.FILE_BUFFER,
                            data: this._bindings.getFileBuffer(request.data),
                        },
                        [],
                    );
                    break;
                case WorkerRequestType.ZIP_EXTRACT_FILE: {
                    if (!this._zip) {
                        this.failWith(request, new Error('zip plugin not loaded'));
                        return;
                    }
                    const archivePath = this._bindings.getFilePath(request.data.archiveFile);
                    if (!archivePath) {
                        this.failWith(request, new Error(`unknown file: ${archivePath}`));
                        return;
                    }
                    const outPath = this._bindings.getFilePath(request.data.outFile);
                    if (!outPath) {
                        this.failWith(request, new Error(`unknown file: ${outPath}`));
                        return;
                    }
                    this._zip!.loadFile(archivePath);
                    this._zip!.extractPathToPath(request.data.entryPath, outPath);
                    this.sendOK(request);
                    break;
                }
                case WorkerRequestType.IMPORT_CSV_FROM_PATH: {
                    this._bindings.importCSVFromPath(request.data[0], request.data[1], request.data[2]);
                    this.sendOK(request);
                    break;
                }
                case WorkerRequestType.IMPORT_JSON_FROM_PATH: {
                    this._bindings.importJSONFromPath(request.data[0], request.data[1], request.data[2]);
                    this.sendOK(request);
                    break;
                }
            }
        } catch (e) {
            return this.failWith(request, e);
        }
    }
}
