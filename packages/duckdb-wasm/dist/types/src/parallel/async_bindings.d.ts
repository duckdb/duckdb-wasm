import { WorkerTaskVariant, ConnectionID, WorkerTaskReturnType } from './worker_request';
import { AsyncDuckDBBindings } from './async_bindings_interface';
import { Logger } from '../log';
import { AsyncDuckDBConnection } from './async_connection';
import { CSVInsertOptions, JSONInsertOptions, ArrowInsertOptions } from '../bindings/insert_options';
import { ScriptTokens } from '../bindings/tokens';
import { FileStatistics } from '../bindings/file_stats';
import { DuckDBConfig } from '../bindings/config';
import { InstantiationProgress } from '../bindings/progress';
import { WebFile } from '../bindings/web_file';
import { DuckDBDataProtocol } from '../bindings';
export declare class AsyncDuckDB implements AsyncDuckDBBindings {
    /** The message handler */
    protected readonly _onMessageHandler: (event: MessageEvent) => void;
    /** The error handler */
    protected readonly _onErrorHandler: (event: ErrorEvent) => void;
    /** The close handler */
    protected readonly _onCloseHandler: () => void;
    /** Instantiate the module */
    protected _onInstantiationProgress: ((p: InstantiationProgress) => void)[];
    /** The logger */
    protected readonly _logger: Logger;
    /** The worker */
    protected _worker: Worker | null;
    /** The promise for the worker shutdown */
    protected _workerShutdownPromise: Promise<null> | null;
    /** Make the worker as terminated */
    protected _workerShutdownResolver: (value: PromiseLike<null> | null) => void;
    /** The next message id */
    protected _nextMessageId: number;
    /** The pending requests */
    protected _pendingRequests: Map<number, WorkerTaskVariant>;
    constructor(logger: Logger, worker?: Worker | null);
    /** Get the logger */
    get logger(): Logger;
    /** Attach to worker */
    protected attach(worker: Worker): void;
    /** Detach from worker */
    detach(): void;
    /** Kill the worker */
    terminate(): Promise<void>;
    /** Post a task */
    protected postTask<W extends WorkerTaskVariant>(task: W, transfer?: ArrayBuffer[]): Promise<WorkerTaskReturnType<W>>;
    /** Received a message */
    protected onMessage(event: MessageEvent): void;
    /** Received an error */
    protected onError(event: ErrorEvent): void;
    /** The worker was closed */
    protected onClose(): void;
    /** Reset the duckdb */
    reset(): Promise<null>;
    /** Ping the worker thread */
    ping(): Promise<any>;
    /** Try to drop a file */
    dropFile(name: string): Promise<null>;
    /** Try to drop files */
    dropFiles(): Promise<null>;
    /** Flush all files */
    flushFiles(): Promise<null>;
    /** Open the database */
    instantiate(mainModuleURL: string, pthreadWorkerURL?: string | null, progress?: (progress: InstantiationProgress) => void): Promise<null>;
    /** Get the version */
    getVersion(): Promise<string>;
    /** Get the feature flags */
    getFeatureFlags(): Promise<number>;
    /** Open a new database */
    open(config: DuckDBConfig): Promise<void>;
    /** Tokenize a script text */
    tokenize(text: string): Promise<ScriptTokens>;
    /** Connect to the database */
    connectInternal(): Promise<number>;
    /** Connect to the database */
    connect(): Promise<AsyncDuckDBConnection>;
    /** Disconnect from the database */
    disconnect(conn: ConnectionID): Promise<void>;
    /** Run a query */
    runQuery(conn: ConnectionID, text: string): Promise<Uint8Array>;
    /** Start a pending query */
    startPendingQuery(conn: ConnectionID, text: string): Promise<Uint8Array | null>;
    /** Poll a pending query */
    pollPendingQuery(conn: ConnectionID): Promise<Uint8Array | null>;
    /** Cancel a pending query */
    cancelPendingQuery(conn: ConnectionID): Promise<boolean>;
    /** Fetch query results */
    fetchQueryResults(conn: ConnectionID): Promise<Uint8Array>;
    /** Get table names */
    getTableNames(conn: number, text: string): Promise<string[]>;
    /** Prepare a statement and return its identifier */
    createPrepared(conn: number, text: string): Promise<number>;
    /** Close a prepared statement */
    closePrepared(conn: number, statement: number): Promise<void>;
    /** Execute a prepared statement and return the full result */
    runPrepared(conn: number, statement: number, params: any[]): Promise<Uint8Array>;
    /** Execute a prepared statement and stream the result */
    sendPrepared(conn: number, statement: number, params: any[]): Promise<Uint8Array>;
    /** Glob file infos */
    globFiles(path: string): Promise<WebFile[]>;
    /** Register file text */
    registerFileText(name: string, text: string): Promise<void>;
    /** Register a file path. */
    registerFileURL(name: string, url: string, proto: DuckDBDataProtocol, directIO: boolean): Promise<void>;
    /** Register an empty file buffer. */
    registerEmptyFileBuffer(name: string): Promise<void>;
    /** Register a file buffer. */
    registerFileBuffer(name: string, buffer: Uint8Array): Promise<void>;
    /** Register a file handle. */
    registerFileHandle<HandleType>(name: string, handle: HandleType, protocol: DuckDBDataProtocol, directIO: boolean): Promise<void>;
    /** Enable file statistics */
    collectFileStatistics(name: string, enable: boolean): Promise<void>;
    /** Export file statistics */
    exportFileStatistics(name: string): Promise<FileStatistics>;
    /** Copy a file to a buffer. */
    copyFileToBuffer(name: string): Promise<Uint8Array>;
    /** Copy a file to a path. */
    copyFileToPath(name: string, path: string): Promise<void>;
    /** Insert arrow from an ipc stream */
    insertArrowFromIPCStream(conn: ConnectionID, buffer: Uint8Array, options?: ArrowInsertOptions): Promise<void>;
    /** Insert a csv file */
    insertCSVFromPath(conn: ConnectionID, path: string, options: CSVInsertOptions): Promise<void>;
    /** Insert a json file */
    insertJSONFromPath(conn: ConnectionID, path: string, options: JSONInsertOptions): Promise<void>;
}
