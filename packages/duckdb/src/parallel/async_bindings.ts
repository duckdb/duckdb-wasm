import {
    WorkerRequestType,
    WorkerResponseType,
    WorkerResponseVariant,
    WorkerTaskVariant,
    WorkerTask,
    ConnectionID,
    ZipExtractToFileArgs,
} from './worker_request';
import { Logger } from '../log';
import { AsyncDuckDBConnection } from './async_connection';
import { CSVTableOptions, JSONTableOptions } from 'src/bindings/table_options';
import { ScriptTokens } from 'src/bindings/tokens';

export class AsyncDuckDB {
    /** The message handler */
    protected _onMessageHandler: (event: MessageEvent) => void;
    /** The error handler */
    protected _onErrorHandler: (event: ErrorEvent) => void;
    /** The close handler */
    protected _onCloseHandler: () => void;

    /** The logger */
    protected _logger: Logger;
    /** The worker */
    protected _worker: Worker | null = null;
    /** The promise for the worker shutdown */
    protected _workerShutdownPromise: Promise<null> | null = null;
    /** Make the worker as terminated */
    protected _workerShutdownResolver: (value: PromiseLike<null> | null) => void = () => {};

    /** The next message id */
    protected _nextMessageId = 0;
    /** The pending requests */
    protected _pendingRequests: Map<number, WorkerTaskVariant> = new Map();

    constructor(logger: Logger, worker: Worker | null = null) {
        this._logger = logger;
        this._onMessageHandler = this.onMessage.bind(this);
        this._onErrorHandler = this.onError.bind(this);
        this._onCloseHandler = this.onClose.bind(this);
        if (worker != null) this.attach(worker);
    }

    /** Get the logger */
    public get logger(): Logger {
        return this._logger;
    }

    /** Attach to worker */
    protected attach(worker: Worker): void {
        this._worker = worker;
        this._worker.addEventListener('message', this._onMessageHandler);
        this._worker.addEventListener('error', this._onErrorHandler);
        this._worker.addEventListener('close', this._onCloseHandler);
        this._workerShutdownPromise = new Promise<null>(
            (resolve: (value: PromiseLike<null> | null) => void, _reject: (reason?: void) => void) => {
                this._workerShutdownResolver = resolve;
            },
        );
    }

    /** Detach from worker */
    public detach(): void {
        if (!this._worker) return;
        this._worker.removeEventListener('message', this._onMessageHandler);
        this._worker.removeEventListener('error', this._onErrorHandler);
        this._worker.removeEventListener('close', this._onCloseHandler);
        this._worker = null;
        this._workerShutdownResolver(null);
        this._workerShutdownPromise = null;
        this._workerShutdownResolver = () => {};
    }

    /** Kill the worker */
    public async terminate(): Promise<void> {
        if (!this._worker) return;
        this._worker.terminate();
        //await this._workerShutdownPromise; TODO deadlocking in karma?
        this._worker = null;
        this._workerShutdownPromise = null;
        this._workerShutdownResolver = () => {};
    }

    /** Post a task */
    protected async postTask(task: WorkerTaskVariant): Promise<any> {
        if (!this._worker) {
            console.error('cannot send a message since the worker is not set!');
            return;
        }
        const mid = this._nextMessageId++;
        this._pendingRequests.set(mid, task);
        this._worker.postMessage({
            messageId: mid,
            type: task.type,
            data: task.data,
        });
        return await task.promise;
    }

    /** Received a message */
    protected onMessage(event: MessageEvent): void {
        const response = event.data as WorkerResponseVariant;

        // Short-circuit unassociated log entries
        if (response.type == WorkerResponseType.LOG) {
            this._logger.log(response.data);
        }

        // Get associated task
        const task = this._pendingRequests.get(response.requestId);
        if (!task) {
            console.warn(`unassociated response: [${response.requestId}, ${response.type.toString()}]`);
            return;
        }
        this._pendingRequests.delete(response.requestId);

        // Request failed?
        if (response.type == WorkerResponseType.ERROR) {
            // Workaround for Firefox not being able to perform structured-clone on Native Errors
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1556604
            const e = new Error(response.data.message);
            e.name = response.data.name;
            e.stack = response.data.stack;

            task.promiseRejecter(e);
            return;
        }

        // Otherwise differentiate between the tasks first
        switch (task.type) {
            case WorkerRequestType.GET_VERSION:
                if (response.type == WorkerResponseType.VERSION_STRING) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.GET_FEATURE_FLAGS:
                if (response.type == WorkerResponseType.FEATURE_FLAGS) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.TOKENIZE:
                if (response.type == WorkerResponseType.SCRIPT_TOKENS) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.RESET:
            case WorkerRequestType.PING:
            case WorkerRequestType.OPEN:
            case WorkerRequestType.DISCONNECT:
                if (response.type == WorkerResponseType.OK) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.DROP_FILE:
                if (response.type == WorkerResponseType.OK) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.DROP_FILES:
                if (response.type == WorkerResponseType.OK) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.FLUSH_FILES:
                if (response.type == WorkerResponseType.OK) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.ADD_FILE_PATH:
                if (response.type == WorkerResponseType.REGISTERED_FILE) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.ADD_FILE_BLOB:
                if (response.type == WorkerResponseType.REGISTERED_FILE) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.ADD_FILE_BUFFER:
                if (response.type == WorkerResponseType.REGISTERED_FILE) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.GET_FILE_OBJECT_URL:
                if (response.type == WorkerResponseType.FILE_OBJECT_URL) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.GET_FILE_BUFFER:
                if (response.type == WorkerResponseType.FILE_BUFFER) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.CONNECT:
                if (response.type == WorkerResponseType.CONNECTION_INFO) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.RUN_QUERY:
                if (response.type == WorkerResponseType.QUERY_RESULT) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.SEND_QUERY:
                if (response.type == WorkerResponseType.QUERY_START) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.FETCH_QUERY_RESULTS:
                if (response.type == WorkerResponseType.QUERY_RESULT_CHUNK) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.ZIP_EXTRACT_FILE:
                if (response.type == WorkerResponseType.OK) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.IMPORT_CSV_FROM_PATH:
                if (response.type == WorkerResponseType.OK) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.IMPORT_JSON_FROM_PATH:
                if (response.type == WorkerResponseType.OK) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
        }
        task.promiseRejecter(new Error(`unexpected response type: ${response.type.toString()}`));
    }

    /** Received an error */
    protected onError(event: ErrorEvent): void {
        console.error(event);
        console.error(`error in duckdb worker: ${event.message}`);
        this._pendingRequests.clear();
    }

    /** The worker was closed */
    protected onClose(): void {
        this._workerShutdownResolver(null);
        if (this._pendingRequests.size != 0) {
            console.warn(`worker terminated with ${this._pendingRequests.size} pending requests`);
            return;
        }
        this._pendingRequests.clear();
    }

    /** Reset the duckdb */
    public async reset(): Promise<null> {
        const task = new WorkerTask<WorkerRequestType.RESET, null, null>(WorkerRequestType.RESET, null);
        return await this.postTask(task);
    }

    /** Ping the worker thread */
    public async ping(): Promise<any> {
        const task = new WorkerTask<WorkerRequestType.PING, null, null>(WorkerRequestType.PING, null);
        await this.postTask(task);
    }

    /** Drop a file by URL */
    public async dropFile(url: string): Promise<null> {
        const task = new WorkerTask<WorkerRequestType.DROP_FILE, string, null>(WorkerRequestType.DROP_FILE, url);
        return await this.postTask(task);
    }

    /** Drop all files */
    public async dropFiles(): Promise<null> {
        const task = new WorkerTask<WorkerRequestType.DROP_FILES, null, null>(WorkerRequestType.DROP_FILES, null);
        return await this.postTask(task);
    }

    /** Flush all files */
    public async flushFiles(): Promise<null> {
        const task = new WorkerTask<WorkerRequestType.FLUSH_FILES, null, null>(WorkerRequestType.FLUSH_FILES, null);
        return await this.postTask(task);
    }

    /** Open the database */
    public async open(wasm: string | null): Promise<null> {
        const task = new WorkerTask<WorkerRequestType.OPEN, string | null, null>(WorkerRequestType.OPEN, wasm);
        return await this.postTask(task);
    }

    /** Get the version */
    public async getVersion(): Promise<string> {
        const task = new WorkerTask<WorkerRequestType.GET_VERSION, null, string>(WorkerRequestType.GET_VERSION, null);
        const version = await this.postTask(task);
        return version;
    }

    /** Get the feature flags */
    public async getFeatureFlags(): Promise<string> {
        const task = new WorkerTask<WorkerRequestType.GET_FEATURE_FLAGS, null, number>(
            WorkerRequestType.GET_FEATURE_FLAGS,
            null,
        );
        const version = await this.postTask(task);
        return version;
    }

    /** Tokenize a script text */
    public async tokenize(text: string): Promise<ScriptTokens> {
        const task = new WorkerTask<WorkerRequestType.TOKENIZE, string, ScriptTokens>(
            WorkerRequestType.TOKENIZE,
            text,
        );
        const tokens = await this.postTask(task);
        return tokens;
    }

    /** Connect to the database */
    public async connectInternal(): Promise<number> {
        const task = new WorkerTask<WorkerRequestType.CONNECT, null, ConnectionID>(WorkerRequestType.CONNECT, null);
        return await this.postTask(task);
    }

    /** Connect to the database */
    public async connect(): Promise<AsyncDuckDBConnection> {
        const cid = await this.connectInternal();
        return new AsyncDuckDBConnection(this, cid);
    }

    /** Disconnect from the database */
    public async disconnect(conn: ConnectionID): Promise<null> {
        const task = new WorkerTask<WorkerRequestType.DISCONNECT, ConnectionID, null>(
            WorkerRequestType.DISCONNECT,
            conn,
        );
        return await this.postTask(task);
    }

    /// Run a query
    public async runQuery(conn: ConnectionID, text: string): Promise<Uint8Array> {
        const task = new WorkerTask<WorkerRequestType.RUN_QUERY, [ConnectionID, string], Uint8Array>(
            WorkerRequestType.RUN_QUERY,
            [conn, text],
        );
        return await this.postTask(task);
    }

    /** Send a query */
    public async sendQuery(conn: ConnectionID, text: string): Promise<Uint8Array> {
        const task = new WorkerTask<WorkerRequestType.SEND_QUERY, [ConnectionID, string], Uint8Array>(
            WorkerRequestType.SEND_QUERY,
            [conn, text],
        );
        return await this.postTask(task);
    }

    /** Fetch query results */
    public async fetchQueryResults(conn: ConnectionID): Promise<Uint8Array> {
        const task = new WorkerTask<WorkerRequestType.FETCH_QUERY_RESULTS, ConnectionID, Uint8Array>(
            WorkerRequestType.FETCH_QUERY_RESULTS,
            conn,
        );
        return await this.postTask(task);
    }

    /** Register a file buffer. */
    public async addFile(url: string): Promise<number> {
        const task = new WorkerTask<WorkerRequestType.ADD_FILE_BUFFER, [string, Uint8Array], number>(
            WorkerRequestType.ADD_FILE_BUFFER,
            [url, new Uint8Array()],
        );
        return await this.postTask(task);
    }

    /** Register a file path. */
    public async addFilePath(url: string, path: string): Promise<number> {
        const task = new WorkerTask<WorkerRequestType.ADD_FILE_PATH, [string, string], number>(
            WorkerRequestType.ADD_FILE_PATH,
            [url, path],
        );
        return await this.postTask(task);
    }

    /** Register a file blob. */
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public async addFileBlob(url: string, blob: any): Promise<number> {
        const task = new WorkerTask<WorkerRequestType.ADD_FILE_BLOB, [string, any], number>(
            WorkerRequestType.ADD_FILE_BLOB,
            [url, blob],
        );
        return await this.postTask(task);
    }

    /** Register a file buffer. */
    public async addFileBuffer(url: string, buffer: Uint8Array): Promise<number> {
        const task = new WorkerTask<WorkerRequestType.ADD_FILE_BUFFER, [string, Uint8Array], number>(
            WorkerRequestType.ADD_FILE_BUFFER,
            [url, buffer],
        );
        return await this.postTask(task);
    }

    /** Get file object URL. */
    public async getFileObjectURL(file_id: number): Promise<string | null> {
        const task = new WorkerTask<WorkerRequestType.GET_FILE_OBJECT_URL, number, string | null>(
            WorkerRequestType.GET_FILE_OBJECT_URL,
            file_id,
        );
        return await this.postTask(task);
    }

    /** Get file buffer. */
    public async getFileBuffer(file_id: number): Promise<Uint8Array | null> {
        const task = new WorkerTask<WorkerRequestType.GET_FILE_BUFFER, number, Uint8Array | null>(
            WorkerRequestType.GET_FILE_BUFFER,
            file_id,
        );
        return await this.postTask(task);
    }

    /** Import a csv file */
    public async importCSVFromPath(conn: ConnectionID, path: string, options: CSVTableOptions): Promise<null> {
        const task = new WorkerTask<WorkerRequestType.IMPORT_CSV_FROM_PATH, [number, string, CSVTableOptions], null>(
            WorkerRequestType.IMPORT_CSV_FROM_PATH,
            [conn, path, options],
        );
        return await this.postTask(task);
    }
    /** Import a json file */
    public async importJSONFromPath(conn: ConnectionID, path: string, options: JSONTableOptions): Promise<null> {
        const task = new WorkerTask<WorkerRequestType.IMPORT_JSON_FROM_PATH, [number, string, JSONTableOptions], null>(
            WorkerRequestType.IMPORT_JSON_FROM_PATH,
            [conn, path, options],
        );
        return await this.postTask(task);
    }

    /** Extract a zip file */
    public async extractZipPath(archiveFile: number, outFile: number, entryPath: string): Promise<number> {
        const task = new WorkerTask<WorkerRequestType.ZIP_EXTRACT_FILE, ZipExtractToFileArgs, null>(
            WorkerRequestType.ZIP_EXTRACT_FILE,
            {
                archiveFile: archiveFile,
                outFile: outFile,
                entryPath: entryPath,
            },
        );
        return await this.postTask(task);
    }
}
