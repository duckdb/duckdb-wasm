import { DuckDBBindings, DuckDBDataProtocol } from '../bindings';
import { WorkerResponseVariant, WorkerRequestVariant, WorkerRequestType, WorkerResponseType } from './worker_request';
import { Logger, LogEntryVariant } from '../log';
import { InstantiationProgress } from '../bindings/progress';

export abstract class AsyncDuckDBDispatcher implements Logger {
    /** The bindings */
    protected _bindings: DuckDBBindings | null = null;
    /** The next message id */
    protected _nextMessageId = 0;

    /** Instantiate the wasm module */
    protected abstract instantiate(
        mainModule: string,
        pthreadWorker: string | null,
        progress: (p: InstantiationProgress) => void,
    ): Promise<DuckDBBindings>;
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
            case WorkerRequestType.INSTANTIATE:
                if (this._bindings != null) {
                    this.failWith(request, new Error('duckdb already initialized'));
                }
                try {
                    this._bindings = await this.instantiate(request.data[0], request.data[1], p => {
                        this.postMessage(
                            {
                                messageId: this._nextMessageId++,
                                requestId: request.messageId,
                                type: WorkerResponseType.INSTANTIATE_PROGRESS,
                                data: p,
                            },
                            [],
                        );
                    });
                    this.sendOK(request);
                } catch (e: any) {
                    console.log(e);
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
                case WorkerRequestType.GET_FEATURE_FLAGS:
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.FEATURE_FLAGS,
                            data: this._bindings.getFeatureFlags(),
                        },
                        [],
                    );
                    break;
                case WorkerRequestType.RESET:
                    this._bindings.reset();
                    this.sendOK(request);
                    break;

                case WorkerRequestType.OPEN: {
                    const path = request.data.path;
                    if (path?.startsWith('opfs://')) {
                        await this._bindings.prepareDBFileHandle(path, DuckDBDataProtocol.BROWSER_FSACCESS);
                        request.data.useDirectIO = true;
                    }
                    this._bindings.open(request.data);
                    this.sendOK(request);
                    break;
                }
                case WorkerRequestType.DROP_FILE:
                    this._bindings.dropFile(request.data);
                    this.sendOK(request);
                    break;
                case WorkerRequestType.DROP_FILES:
                    this._bindings.dropFiles();
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
                            data: conn.useUnsafe((_, c) => c),
                        },
                        [],
                    );
                    break;
                }
                case WorkerRequestType.DISCONNECT:
                    this._bindings.disconnect(request.data);
                    this.sendOK(request);
                    break;
                case WorkerRequestType.CREATE_PREPARED: {
                    const result = this._bindings.createPrepared(request.data[0], request.data[1]);
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.PREPARED_STATEMENT_ID,
                            data: result,
                        },
                        [],
                    );
                    break;
                }
                case WorkerRequestType.CLOSE_PREPARED: {
                    this._bindings.closePrepared(request.data[0], request.data[1]);
                    this.sendOK(request);
                    break;
                }
                case WorkerRequestType.RUN_PREPARED: {
                    const result = this._bindings.runPrepared(request.data[0], request.data[1], request.data[2]);
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
                case WorkerRequestType.SEND_PREPARED: {
                    const result = this._bindings.sendPrepared(request.data[0], request.data[1], request.data[2]);
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.QUERY_RESULT_HEADER,
                            data: result,
                        },
                        [result.buffer],
                    );
                    break;
                }
                case WorkerRequestType.START_PENDING_QUERY: {
                    const result = this._bindings.startPendingQuery(request.data[0], request.data[1]);
                    const transfer = [];
                    if (result) {
                        transfer.push(result.buffer);
                    }
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.QUERY_RESULT_HEADER_OR_NULL,
                            data: result,
                        },
                        transfer,
                    );
                    break;
                }
                case WorkerRequestType.POLL_PENDING_QUERY: {
                    const result = this._bindings.pollPendingQuery(request.data);
                    const transfer = [];
                    if (result) {
                        transfer.push(result.buffer);
                    }
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.QUERY_RESULT_HEADER_OR_NULL,
                            data: result,
                        },
                        transfer,
                    );
                    break;
                }
                case WorkerRequestType.CANCEL_PENDING_QUERY: {
                    const result = this._bindings.cancelPendingQuery(request.data);
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.SUCCESS,
                            data: result,
                        },
                        [],
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
                case WorkerRequestType.GET_TABLE_NAMES: {
                    const result = this._bindings.getTableNames(request.data[0], request.data[1]);
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.TABLE_NAMES,
                            data: result,
                        },
                        [],
                    );
                    break;
                }
                case WorkerRequestType.GLOB_FILE_INFOS: {
                    const infos = this._bindings.globFiles(request.data);
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.FILE_INFOS,
                            data: infos,
                        },
                        [],
                    );
                    break;
                }

                case WorkerRequestType.REGISTER_FILE_URL:
                    this._bindings.registerFileURL(request.data[0], request.data[1], request.data[2], request.data[3]);
                    this.sendOK(request);
                    break;

                case WorkerRequestType.REGISTER_FILE_BUFFER:
                    this._bindings.registerFileBuffer(request.data[0], request.data[1]);
                    this.sendOK(request);
                    break;

                case WorkerRequestType.REGISTER_FILE_HANDLE:
                    await this._bindings.registerFileHandle(
                        request.data[0],
                        request.data[1],
                        request.data[2],
                        request.data[3],
                    );
                    this.sendOK(request);
                    break;

                case WorkerRequestType.COPY_FILE_TO_PATH:
                    this._bindings.copyFileToPath(request.data[0], request.data[1]);
                    this.sendOK(request);
                    break;

                case WorkerRequestType.COPY_FILE_TO_BUFFER: {
                    const buffer = this._bindings.copyFileToBuffer(request.data);
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.FILE_BUFFER,
                            data: buffer,
                        },
                        [],
                    );
                    break;
                }
                case WorkerRequestType.COLLECT_FILE_STATISTICS:
                    this._bindings.collectFileStatistics(request.data[0], request.data[1]);
                    this.sendOK(request);
                    break;

                case WorkerRequestType.EXPORT_FILE_STATISTICS: {
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.FILE_STATISTICS,
                            data: this._bindings.exportFileStatistics(request.data),
                        },
                        [],
                    );
                    break;
                }
                case WorkerRequestType.INSERT_ARROW_FROM_IPC_STREAM: {
                    this._bindings.insertArrowFromIPCStream(request.data[0], request.data[1], request.data[2]);
                    this.sendOK(request);
                    break;
                }
                case WorkerRequestType.INSERT_CSV_FROM_PATH: {
                    this._bindings.insertCSVFromPath(request.data[0], request.data[1], request.data[2]);
                    this.sendOK(request);
                    break;
                }
                case WorkerRequestType.INSERT_JSON_FROM_PATH: {
                    this._bindings.insertJSONFromPath(request.data[0], request.data[1], request.data[2]);
                    this.sendOK(request);
                    break;
                }
                case WorkerRequestType.TOKENIZE: {
                    const result = this._bindings.tokenize(request.data);
                    this.postMessage(
                        {
                            messageId: this._nextMessageId++,
                            requestId: request.messageId,
                            type: WorkerResponseType.SCRIPT_TOKENS,
                            data: result,
                        },
                        [],
                    );
                    break;
                }
            }
        } catch (e: any) {
            console.log(e);
            return this.failWith(request, e);
        }
    }
}
