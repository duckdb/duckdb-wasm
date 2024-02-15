import {
    WorkerRequestType,
    WorkerResponseType,
    WorkerResponseVariant,
    WorkerTaskVariant,
    WorkerTask,
    ConnectionID,
    WorkerTaskReturnType,
} from './worker_request';
import { AsyncDuckDBBindings } from './async_bindings_interface';
import { Logger } from '../log';
import { AsyncDuckDBConnection } from './async_connection';
import { CSVInsertOptions, JSONInsertOptions, ArrowInsertOptions } from '../bindings/insert_options';
import { ScriptTokens } from '../bindings/tokens';
import { FileStatistics } from '../bindings/file_stats';
import { DuckDBConfig } from '../bindings/config';
import { InstantiationProgress } from '../bindings/progress';
import { arrowToSQLField } from '../json_typedef';
import { WebFile } from '../bindings/web_file';
import { DuckDBDataProtocol } from '../bindings';

const TEXT_ENCODER = new TextEncoder();

export class AsyncDuckDB implements AsyncDuckDBBindings {
    /** The message handler */
    protected readonly _onMessageHandler: (event: MessageEvent) => void;
    /** The error handler */
    protected readonly _onErrorHandler: (event: ErrorEvent) => void;
    /** The close handler */
    protected readonly _onCloseHandler: () => void;

    /** Instantiate the module */
    protected _onInstantiationProgress: ((p: InstantiationProgress) => void)[] = [];

    /** The logger */
    protected readonly _logger: Logger;
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
    protected async postTask<W extends WorkerTaskVariant>(
        task: W,
        transfer: ArrayBuffer[] = [],
    ): Promise<WorkerTaskReturnType<W>> {
        if (!this._worker) {
            console.error('cannot send a message since the worker is not set!');
            return undefined as any;
        }
        const mid = this._nextMessageId++;
        this._pendingRequests.set(mid, task);
        this._worker.postMessage(
            {
                messageId: mid,
                type: task.type,
                data: task.data,
            },
            transfer,
        );
        return (await task.promise) as WorkerTaskReturnType<W>;
    }

    /** Received a message */
    protected onMessage(event: MessageEvent): void {
        // Unassociated responses?
        const response = event.data as WorkerResponseVariant;
        switch (response.type) {
            // Request failed?
            case WorkerResponseType.LOG: {
                this._logger.log(response.data);
                return;
            }
            // Call progress callback
            case WorkerResponseType.INSTANTIATE_PROGRESS: {
                for (const p of this._onInstantiationProgress) {
                    p(response.data);
                }
                return;
            }
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
            if (Object.getOwnPropertyDescriptor(e, 'stack')?.writable) {
                e.stack = response.data.stack;
            }
            task.promiseRejecter(e);
            return;
        }

        // Otherwise differentiate between the tasks first
        switch (task.type) {
            case WorkerRequestType.CLOSE_PREPARED:
            case WorkerRequestType.COLLECT_FILE_STATISTICS:
            case WorkerRequestType.COPY_FILE_TO_PATH:
            case WorkerRequestType.DISCONNECT:
            case WorkerRequestType.DROP_FILE:
            case WorkerRequestType.DROP_FILES:
            case WorkerRequestType.FLUSH_FILES:
            case WorkerRequestType.INSERT_ARROW_FROM_IPC_STREAM:
            case WorkerRequestType.INSERT_CSV_FROM_PATH:
            case WorkerRequestType.INSERT_JSON_FROM_PATH:
            case WorkerRequestType.OPEN:
            case WorkerRequestType.PING:
            case WorkerRequestType.REGISTER_FILE_BUFFER:
            case WorkerRequestType.REGISTER_FILE_HANDLE:
            case WorkerRequestType.REGISTER_FILE_URL:
            case WorkerRequestType.RESET:
                if (response.type == WorkerResponseType.OK) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.INSTANTIATE:
                this._onInstantiationProgress = [];
                if (response.type == WorkerResponseType.OK) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.GLOB_FILE_INFOS:
                if (response.type == WorkerResponseType.FILE_INFOS) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
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
            case WorkerRequestType.GET_TABLE_NAMES:
                if (response.type == WorkerResponseType.TABLE_NAMES) {
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
            case WorkerRequestType.COPY_FILE_TO_BUFFER:
                if (response.type == WorkerResponseType.FILE_BUFFER) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.EXPORT_FILE_STATISTICS:
                if (response.type == WorkerResponseType.FILE_STATISTICS) {
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
            case WorkerRequestType.RUN_PREPARED:
            case WorkerRequestType.RUN_QUERY:
                if (response.type == WorkerResponseType.QUERY_RESULT) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.SEND_PREPARED:
                if (response.type == WorkerResponseType.QUERY_RESULT_HEADER) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.START_PENDING_QUERY:
                if (response.type == WorkerResponseType.QUERY_RESULT_HEADER_OR_NULL) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.POLL_PENDING_QUERY:
                if (response.type == WorkerResponseType.QUERY_RESULT_HEADER_OR_NULL) {
                    task.promiseResolver(response.data);
                    return;
                }
                break;
            case WorkerRequestType.CANCEL_PENDING_QUERY:
                this._onInstantiationProgress = [];
                if (response.type == WorkerResponseType.SUCCESS) {
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
            case WorkerRequestType.CREATE_PREPARED:
                if (response.type == WorkerResponseType.PREPARED_STATEMENT_ID) {
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
    public async dropFile(name: string): Promise<null> {
        const task = new WorkerTask<WorkerRequestType.DROP_FILE, string, null>(WorkerRequestType.DROP_FILE, name);
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
    public async instantiate(
        mainModuleURL: string,
        pthreadWorkerURL: string | null = null,
        progress: (progress: InstantiationProgress) => void = _p => {},
    ): Promise<null> {
        this._onInstantiationProgress.push(progress);
        const task = new WorkerTask<WorkerRequestType.INSTANTIATE, [string, string | null], null>(
            WorkerRequestType.INSTANTIATE,
            [mainModuleURL, pthreadWorkerURL],
        );
        return await this.postTask(task);
    }

    /** Get the version */
    public async getVersion(): Promise<string> {
        const task = new WorkerTask<WorkerRequestType.GET_VERSION, null, string>(WorkerRequestType.GET_VERSION, null);
        const version = await this.postTask(task);
        return version;
    }

    /** Get the feature flags */
    public async getFeatureFlags(): Promise<number> {
        const task = new WorkerTask<WorkerRequestType.GET_FEATURE_FLAGS, null, number>(
            WorkerRequestType.GET_FEATURE_FLAGS,
            null,
        );
        const feature = await this.postTask(task);
        return feature;
    }

    /** Open a new database */
    public async open(config: DuckDBConfig): Promise<void> {
        const task = new WorkerTask<WorkerRequestType.OPEN, DuckDBConfig, null>(WorkerRequestType.OPEN, config);
        await this.postTask(task);
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
    public async disconnect(conn: ConnectionID): Promise<void> {
        const task = new WorkerTask<WorkerRequestType.DISCONNECT, ConnectionID, null>(
            WorkerRequestType.DISCONNECT,
            conn,
        );
        await this.postTask(task);
    }

    /** Run a query */
    public async runQuery(conn: ConnectionID, text: string): Promise<Uint8Array> {
        const task = new WorkerTask<WorkerRequestType.RUN_QUERY, [ConnectionID, string], Uint8Array>(
            WorkerRequestType.RUN_QUERY,
            [conn, text],
        );
        return await this.postTask(task);
    }

    /** Start a pending query */
    public async startPendingQuery(conn: ConnectionID, text: string): Promise<Uint8Array | null> {
        const task = new WorkerTask<WorkerRequestType.START_PENDING_QUERY, [ConnectionID, string], Uint8Array | null>(
            WorkerRequestType.START_PENDING_QUERY,
            [conn, text],
        );
        return await this.postTask(task);
    }
    /** Poll a pending query */
    public async pollPendingQuery(conn: ConnectionID): Promise<Uint8Array | null> {
        const task = new WorkerTask<WorkerRequestType.POLL_PENDING_QUERY, ConnectionID, Uint8Array | null>(
            WorkerRequestType.POLL_PENDING_QUERY,
            conn,
        );
        return await this.postTask(task);
    }
    /** Cancel a pending query */
    public async cancelPendingQuery(conn: ConnectionID): Promise<boolean> {
        const task = new WorkerTask<WorkerRequestType.CANCEL_PENDING_QUERY, ConnectionID, boolean>(
            WorkerRequestType.CANCEL_PENDING_QUERY,
            conn,
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

    /** Get table names */
    public async getTableNames(conn: number, text: string): Promise<string[]> {
        const task = new WorkerTask<WorkerRequestType.GET_TABLE_NAMES, [number, string], string[]>(
            WorkerRequestType.GET_TABLE_NAMES,
            [conn, text],
        );
        return await this.postTask(task);
    }

    /** Prepare a statement and return its identifier */
    public async createPrepared(conn: number, text: string): Promise<number> {
        const task = new WorkerTask<WorkerRequestType.CREATE_PREPARED, [number, string], number>(
            WorkerRequestType.CREATE_PREPARED,
            [conn, text],
        );
        return await this.postTask(task);
    }
    /** Close a prepared statement */
    public async closePrepared(conn: number, statement: number): Promise<void> {
        const task = new WorkerTask<WorkerRequestType.CLOSE_PREPARED, [number, number], null>(
            WorkerRequestType.CLOSE_PREPARED,
            [conn, statement],
        );
        await this.postTask(task);
    }
    /** Execute a prepared statement and return the full result */
    public async runPrepared(conn: number, statement: number, params: any[]): Promise<Uint8Array> {
        const task = new WorkerTask<WorkerRequestType.RUN_PREPARED, [ConnectionID, number, any[]], Uint8Array>(
            WorkerRequestType.RUN_PREPARED,
            [conn, statement, params],
        );
        return await this.postTask(task);
    }
    /** Execute a prepared statement and stream the result */
    public async sendPrepared(conn: number, statement: number, params: any[]): Promise<Uint8Array> {
        const task = new WorkerTask<WorkerRequestType.SEND_PREPARED, [ConnectionID, number, any[]], Uint8Array>(
            WorkerRequestType.SEND_PREPARED,
            [conn, statement, params],
        );
        return await this.postTask(task);
    }
    /** Glob file infos */
    public async globFiles(path: string): Promise<WebFile[]> {
        const task = new WorkerTask<WorkerRequestType.GLOB_FILE_INFOS, string, WebFile[]>(
            WorkerRequestType.GLOB_FILE_INFOS,
            path,
        );
        return await this.postTask(task);
    }
    /** Register file text */
    public async registerFileText(name: string, text: string): Promise<void> {
        const buffer = TEXT_ENCODER.encode(text);
        await this.registerFileBuffer(name, buffer);
    }
    /** Register a file path. */
    public async registerFileURL(
        name: string,
        url: string,
        proto: DuckDBDataProtocol,
        directIO: boolean,
    ): Promise<void> {
        if (url === undefined) {
            url = name;
        }
        const task = new WorkerTask<
            WorkerRequestType.REGISTER_FILE_URL,
            [string, string, DuckDBDataProtocol, boolean],
            null
        >(WorkerRequestType.REGISTER_FILE_URL, [name, url, proto, directIO]);
        await this.postTask(task);
    }

    /** Register an empty file buffer. */
    public async registerEmptyFileBuffer(name: string): Promise<void> {
/*
        const task = new WorkerTask<WorkerRequestType.REGISTER_FILE_BUFFER, [string, Uint8Array], null>(
            WorkerRequestType.REGISTER_FILE_BUFFER,
            [name, new Uint8Array()],
        );
        await this.postTask(task);
*/
    }

    /** Register a file buffer. */
    public async registerFileBuffer(name: string, buffer: Uint8Array): Promise<void> {
        const task = new WorkerTask<WorkerRequestType.REGISTER_FILE_BUFFER, [string, Uint8Array], null>(
            WorkerRequestType.REGISTER_FILE_BUFFER,
            [name, buffer],
        );
        await this.postTask(task, [buffer.buffer]);
    }

    /** Register a file handle. */
    public async registerFileHandle<HandleType>(
        name: string,
        handle: HandleType,
        protocol: DuckDBDataProtocol,
        directIO: boolean,
    ): Promise<void> {
        const task = new WorkerTask<
            WorkerRequestType.REGISTER_FILE_HANDLE,
            [string, any, DuckDBDataProtocol, boolean],
            null
        >(WorkerRequestType.REGISTER_FILE_HANDLE, [name, handle, protocol, directIO]);
        await this.postTask(task, []);
    }

    /** Enable file statistics */
    public async collectFileStatistics(name: string, enable: boolean): Promise<void> {
        const task = new WorkerTask<WorkerRequestType.COLLECT_FILE_STATISTICS, [string, boolean], null>(
            WorkerRequestType.COLLECT_FILE_STATISTICS,
            [name, enable],
        );
        await this.postTask(task, []);
    }

    /** Export file statistics */
    public async exportFileStatistics(name: string): Promise<FileStatistics> {
        const task = new WorkerTask<WorkerRequestType.EXPORT_FILE_STATISTICS, string, FileStatistics>(
            WorkerRequestType.EXPORT_FILE_STATISTICS,
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
    public async copyFileToPath(name: string, path: string): Promise<void> {
        const task = new WorkerTask<WorkerRequestType.COPY_FILE_TO_PATH, [string, string], null>(
            WorkerRequestType.COPY_FILE_TO_PATH,
            [name, path],
        );
        await this.postTask(task);
    }

    /** Insert arrow from an ipc stream */
    public async insertArrowFromIPCStream(
        conn: ConnectionID,
        buffer: Uint8Array,
        options?: ArrowInsertOptions,
    ): Promise<void> {
        if (buffer.length == 0) return;
        // Pass to the worker
        const task = new WorkerTask<
            WorkerRequestType.INSERT_ARROW_FROM_IPC_STREAM,
            [number, Uint8Array, ArrowInsertOptions | undefined],
            null
        >(WorkerRequestType.INSERT_ARROW_FROM_IPC_STREAM, [conn, buffer, options]);
        await this.postTask(task, [buffer.buffer]);
    }
    /** Insert a csv file */
    public async insertCSVFromPath(conn: ConnectionID, path: string, options: CSVInsertOptions): Promise<void> {
        // Flatten the table options
        if (options.columns !== undefined) {
            const out = [];
            for (const k in options.columns) {
                const type = options.columns[k];
                out.push(arrowToSQLField(k, type));
            }
            options.columnsFlat = out;
            delete options.columns;
        }

        // Pass to the worker
        const task = new WorkerTask<WorkerRequestType.INSERT_CSV_FROM_PATH, [number, string, CSVInsertOptions], null>(
            WorkerRequestType.INSERT_CSV_FROM_PATH,
            [conn, path, options],
        );
        await this.postTask(task);
    }
    /** Insert a json file */
    public async insertJSONFromPath(conn: ConnectionID, path: string, options: JSONInsertOptions): Promise<void> {
        // Flatten the table options
        if (options.columns !== undefined) {
            const out = [];
            for (const k in options.columns) {
                const type = options.columns[k];
                out.push(arrowToSQLField(k, type));
            }
            options.columnsFlat = out;
            delete options.columns;
        }

        // Pass to the worker
        const task = new WorkerTask<WorkerRequestType.INSERT_JSON_FROM_PATH, [number, string, JSONInsertOptions], null>(
            WorkerRequestType.INSERT_JSON_FROM_PATH,
            [conn, path, options],
        );
        await this.postTask(task);
    }
}
