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
import { FileStatistics } from 'src/bindings/file_stats';

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
    protected async postTask(task: WorkerTaskVariant, transfer: ArrayBuffer[] = []): Promise<any> {
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
            case WorkerRequestType.FLUSH_FILES:
                if (response.type == WorkerResponseType.OK) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.DROP_FILE:
                if (response.type == WorkerResponseType.SUCCESS) {
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
            case WorkerRequestType.REGISTER_FILE_URL:
                if (response.type == WorkerResponseType.OK) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.REGISTER_FILE_BUFFER:
                if (response.type == WorkerResponseType.OK) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.REGISTER_FILE_HANDLE:
                if (response.type == WorkerResponseType.OK) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.COPY_FILE_TO_PATH:
                if (response.type == WorkerResponseType.OK) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.COPY_FILE_TO_BUFFER:
                if (response.type == WorkerResponseType.FILE_BUFFER) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.ENABLE_FILE_STATISTICS:
                if (response.type == WorkerResponseType.OK) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.EXPORT_FILE_BLOCK_STATISTICS:
                if (response.type == WorkerResponseType.FILE_BLOCK_STATISTICS) {
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
    /** Try to drop a file */
    public async dropFile(name: string): Promise<boolean> {
        const task = new WorkerTask<WorkerRequestType.DROP_FILE, string, boolean>(WorkerRequestType.DROP_FILE, name);
        return await this.postTask(task);
    }
    /** Try to drop files */
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
    public async open(mainModuleURL: string, pthreadWorkerURL: string | null = null): Promise<null> {
        const task = new WorkerTask<WorkerRequestType.OPEN, [string, string | null], null>(WorkerRequestType.OPEN, [
            mainModuleURL,
            pthreadWorkerURL,
        ]);
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
        const task = new WorkerTask<WorkerRequestType.TOKENIZE, string, ScriptTokens>(WorkerRequestType.TOKENIZE, text);
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

    /** Register a file path. */
    public async registerFileURL(name: string, url: string): Promise<null> {
        const task = new WorkerTask<WorkerRequestType.REGISTER_FILE_URL, [string, string], null>(
            WorkerRequestType.REGISTER_FILE_URL,
            [name, url],
        );
        return await this.postTask(task);
    }

    /** Register an empty file buffer. */
    public async registerEmptyFileBuffer(name: string): Promise<null> {
        const task = new WorkerTask<WorkerRequestType.REGISTER_FILE_BUFFER, [string, Uint8Array], null>(
            WorkerRequestType.REGISTER_FILE_BUFFER,
            [name, new Uint8Array()],
        );
        return await this.postTask(task);
    }

    /** Register a file buffer. */
    public async registerFileBuffer(name: string, buffer: Uint8Array): Promise<null> {
        const task = new WorkerTask<WorkerRequestType.REGISTER_FILE_BUFFER, [string, Uint8Array], null>(
            WorkerRequestType.REGISTER_FILE_BUFFER,
            [name, buffer],
        );
        return await this.postTask(task, [buffer.buffer]);
    }

    /** Register a file handle. */
    public async registerFileHandle<HandleType>(name: string, handle: HandleType): Promise<null> {
        const task = new WorkerTask<WorkerRequestType.REGISTER_FILE_HANDLE, [string, any], null>(
            WorkerRequestType.REGISTER_FILE_HANDLE,
            [name, handle],
        );
        return await this.postTask(task, []);
    }

    /** Enable file statistics */
    public async enableFileStatistics(name: string, enable: boolean): Promise<null> {
        const task = new WorkerTask<WorkerRequestType.ENABLE_FILE_STATISTICS, [string, boolean], null>(
            WorkerRequestType.ENABLE_FILE_STATISTICS,
            [name, enable],
        );
        return await this.postTask(task, []);
    }

    /** Export file block statistics */
    public async exportFileBlockStatistics(name: string): Promise<FileStatistics> {
        const task = new WorkerTask<WorkerRequestType.EXPORT_FILE_BLOCK_STATISTICS, string, FileStatistics>(
            WorkerRequestType.EXPORT_FILE_BLOCK_STATISTICS,
            name,
        );
        return await this.postTask(task, []);
    }

    /** Copy a file to a buffer. */
    public async copyFileToBuffer(name: string): Promise<Uint8Array> {
        const task = new WorkerTask<WorkerRequestType.COPY_FILE_TO_BUFFER, string, Uint8Array>(
            WorkerRequestType.COPY_FILE_TO_BUFFER,
            name,
        );
        return await this.postTask(task);
    }

    /** Copy a file to a path. */
    public async copyFileToPath(name: string, path: string): Promise<null> {
        const task = new WorkerTask<WorkerRequestType.COPY_FILE_TO_PATH, [string, string], null>(
            WorkerRequestType.COPY_FILE_TO_PATH,
            [name, path],
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
    public async extractZipPath(archiveFile: string, outFile: string, entryPath: string): Promise<number> {
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
