import { DuckDBModule, PThread } from './duckdb_module';
import { DuckDBConfig } from './config';
import { Logger } from '../log';
import { InstantiationProgress } from './progress';
import { DuckDBBindings } from './bindings_interface';
import { DuckDBConnection } from './connection';
import { DuckDBRuntime, DuckDBDataProtocol } from './runtime';
import { CSVInsertOptions, JSONInsertOptions, ArrowInsertOptions } from './insert_options';
import { ScriptTokens } from './tokens';
import { FileStatistics } from './file_stats';
import { WebFile } from './web_file';
import * as arrow from 'apache-arrow';
declare global {
    var DUCKDB_RUNTIME: any;
}
/** A DuckDB Feature */
export declare enum DuckDBFeature {
    WASM_EXCEPTIONS = 1,
    WASM_THREADS = 2,
    WASM_SIMD = 4,
    WASM_BULK_MEMORY = 8,
    EMIT_BIGINT = 16
}
/** The proxy for either the browser- order node-based DuckDB API */
export declare abstract class DuckDBBindingsBase implements DuckDBBindings {
    /** The logger */
    protected readonly _logger: Logger;
    /** Backend-dependent native-glue code for DuckDB */
    protected readonly _runtime: DuckDBRuntime;
    /** The instance */
    protected _instance: DuckDBModule | null;
    /** The loading promise */
    protected _initPromise: Promise<void> | null;
    /** The resolver for the open promise (called by onRuntimeInitialized) */
    protected _initPromiseResolver: () => void;
    /** The next UDF id */
    protected _nextUDFId: number;
    constructor(logger: Logger, runtime: DuckDBRuntime);
    /** Get the logger */
    get logger(): Logger;
    /** Get the instance */
    get mod(): DuckDBModule;
    /** Get the instance */
    get pthread(): PThread | null;
    /** Instantiate the module */
    protected abstract instantiateImpl(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule>;
    /** Instantiate the module */
    protected onInstantiationProgress: ((p: InstantiationProgress) => void)[];
    /** Instantiate the database */
    instantiate(onProgress?: (progress: InstantiationProgress) => void): Promise<this>;
    /** Open a database with a config */
    open(config: DuckDBConfig): void;
    /** Reset the database */
    reset(): void;
    /** Get the version */
    getVersion(): string;
    /** Get the feature flags */
    getFeatureFlags(): number;
    /** Tokenize a script */
    tokenize(text: string): ScriptTokens;
    /** Connect to database */
    connect(): DuckDBConnection;
    /** Disconnect from database */
    disconnect(conn: number): void;
    /** Send a query and return the full result */
    runQuery(conn: number, text: string): Uint8Array;
    /**
     *  Start a pending query asynchronously.
     *  This method returns either the arrow ipc schema or null.
     *  On null, the query has to be executed using `pollPendingQuery` until that returns != null.
     *  Results can then be fetched using `fetchQueryResults`
     */
    startPendingQuery(conn: number, text: string): Uint8Array | null;
    /** Poll a pending query */
    pollPendingQuery(conn: number): Uint8Array | null;
    /** Cancel a pending query */
    cancelPendingQuery(conn: number): boolean;
    /** Fetch query results */
    fetchQueryResults(conn: number): Uint8Array;
    /** Get table names */
    getTableNames(conn: number, text: string): string[];
    /** Create a scalar function */
    createScalarFunction(conn: number, name: string, returns: arrow.DataType, func: (...args: any[]) => void): void;
    /** Prepare a statement and return its identifier */
    createPrepared(conn: number, text: string): number;
    /** Close a prepared statement */
    closePrepared(conn: number, statement: number): void;
    /** Execute a prepared statement and return the full result */
    runPrepared(conn: number, statement: number, params: any[]): Uint8Array;
    /** Execute a prepared statement and stream the result */
    sendPrepared(conn: number, statement: number, params: any[]): Uint8Array;
    /** Insert record batches from an arrow ipc stream */
    insertArrowFromIPCStream(conn: number, buffer: Uint8Array, options?: ArrowInsertOptions): void;
    /** Insert csv from path */
    insertCSVFromPath(conn: number, path: string, options: CSVInsertOptions): void;
    /** Insert json from path */
    insertJSONFromPath(conn: number, path: string, options: JSONInsertOptions): void;
    /** Glob file infos */
    globFiles(path: string): WebFile[];
    /** Register a file object URL */
    registerFileURL(name: string, url: string, proto: DuckDBDataProtocol, directIO?: boolean): void;
    /** Register file text */
    registerFileText(name: string, text: string): void;
    /** Register a file buffer */
    registerFileBuffer(name: string, buffer: Uint8Array): void;
    /** Register a file object URL */
    registerFileHandle<HandleType>(name: string, handle: HandleType, protocol: DuckDBDataProtocol, directIO: boolean): void;
    /** Drop file */
    dropFile(name: string): void;
    /** Drop files */
    dropFiles(): void;
    /** Flush all files */
    flushFiles(): void;
    /** Write a file to a path */
    copyFileToPath(name: string, path: string): void;
    /** Write a file to a buffer */
    copyFileToBuffer(name: string): Uint8Array;
    /** Enable tracking of file statistics */
    collectFileStatistics(file: string, enable: boolean): void;
    /** Export file statistics */
    exportFileStatistics(file: string): FileStatistics;
}
