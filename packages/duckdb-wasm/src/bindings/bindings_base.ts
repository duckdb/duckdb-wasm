import { DuckDBModule, PThread } from './duckdb_module';
import { DuckDBConfig } from './config';
import { Logger } from '../log';
import { InstantiationProgress } from './progress';
import { DuckDBBindings } from './bindings_interface';
import { DuckDBConnection } from './connection';
import { StatusCode } from '../status';
import { dropResponseBuffers, DuckDBRuntime, readString, callSRet, copyBuffer, DuckDBDataProtocol } from './runtime';
import { CSVInsertOptions, JSONInsertOptions, ArrowInsertOptions } from './insert_options';
import { ScriptTokens } from './tokens';
import { FileStatistics } from './file_stats';
import { arrowToSQLField, arrowToSQLType } from '../json_typedef';
import { WebFile } from './web_file';
import { UDFFunction, UDFFunctionDeclaration } from './udf_function';
import * as arrow from 'apache-arrow';

const TEXT_ENCODER = new TextEncoder();

declare global {
    // eslint-disable-next-line no-var
    var DUCKDB_RUNTIME: any;
}

/** A DuckDB Feature */
export enum DuckDBFeature {
    WASM_EXCEPTIONS = 1 << 0,
    WASM_THREADS = 1 << 1,
    WASM_SIMD = 1 << 2,
    WASM_BULK_MEMORY = 1 << 3,
    EMIT_BIGINT = 1 << 4,
}

/** The proxy for either the browser- order node-based DuckDB API */
export abstract class DuckDBBindingsBase implements DuckDBBindings {
    /** The logger */
    protected readonly _logger: Logger;
    /** Backend-dependent native-glue code for DuckDB */
    protected readonly _runtime: DuckDBRuntime;
    /** The instance */
    protected _instance: DuckDBModule | null = null;
    /** The loading promise */
    protected _initPromise: Promise<void> | null = null;
    /** The resolver for the open promise (called by onRuntimeInitialized) */
    protected _initPromiseResolver: () => void = () => {};
    /** The next UDF id */
    protected _nextUDFId: number;

    constructor(logger: Logger, runtime: DuckDBRuntime) {
        this._logger = logger;
        this._runtime = runtime;
        this._nextUDFId = 1;
    }

    /** Get the logger */
    public get logger(): Logger {
        return this._logger;
    }
    /** Get the instance */
    public get mod(): DuckDBModule {
        return this._instance!;
    }
    /** Get the instance */
    public get pthread(): PThread | null {
        return this.mod.PThread || null;
    }

    /** Instantiate the module */
    protected abstract instantiateImpl(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule>;
    /** Instantiate the module */
    protected onInstantiationProgress: ((p: InstantiationProgress) => void)[] = [];
    /** Instantiate the database */
    public async instantiate(onProgress: (progress: InstantiationProgress) => void = _ => {}): Promise<this> {
        // Already opened?
        if (this._instance != null) {
            return this;
        }
        // Open in progress?
        if (this._initPromise != null) {
            this.onInstantiationProgress.push(onProgress);
            await this._initPromise;
        }
        // Create a promise that we can await
        this._initPromise = new Promise(resolve => {
            this._initPromiseResolver = resolve;
        });
        // Register progress handler
        this.onInstantiationProgress = [onProgress];
        // Initialize duckdb
        this._instance = await this.instantiateImpl({
            print: console.log.bind(console),
            printErr: console.log.bind(console),
            onRuntimeInitialized: this._initPromiseResolver,
        });
        // Wait for onRuntimeInitialized
        await this._initPromise;
        this._initPromise = null;
        // Remove own progress callback
        this.onInstantiationProgress = this.onInstantiationProgress.filter(x => x != onProgress);
        (globalThis as any).DUCKDB_BINDINGS = this;
        return this;
    }
    /** Open a database with a config */
    public open(config: DuckDBConfig): void {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_open', ['string'], [JSON.stringify(config)]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        dropResponseBuffers(this.mod);
    }

    /** Reset the database */
    public reset(): void {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_reset', [], []);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        dropResponseBuffers(this.mod);
    }

    /** Get the version */
    public getVersion(): string {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_get_version', [], []);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        const version = readString(this.mod, d, n);
        dropResponseBuffers(this.mod);
        return version;
    }
    /** Get the feature flags */
    public getFeatureFlags(): number {
        return this.mod.ccall('duckdb_web_get_feature_flags', 'number', [], []);
    }

    /** Tokenize a script */
    public tokenize(text: string): ScriptTokens {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_tokenize', ['string'], [text]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        const res = readString(this.mod, d, n);
        dropResponseBuffers(this.mod);
        return JSON.parse(res) as ScriptTokens;
    }

    /** Connect to database */
    public connect(): DuckDBConnection {
        const conn = this.mod.ccall('duckdb_web_connect', 'number', [], []);
        return new DuckDBConnection(this, conn);
    }
    /** Disconnect from database */
    public disconnect(conn: number): void {
        this.mod.ccall('duckdb_web_disconnect', null, ['number'], [conn]);
        if (this.pthread) {
            for (const worker of [...this.pthread.runningWorkers, ...this.pthread.unusedWorkers]) {
                worker.postMessage({
                    cmd: 'dropUDFFunctions',
                    connectionId: conn,
                });
            }
        }
    }

    /** Send a query and return the full result */
    public runQuery(conn: number, text: string): Uint8Array {
        const BUF = TEXT_ENCODER.encode(text);
        const bufferPtr = this.mod._malloc(BUF.length );
        const bufferOfs = this.mod.HEAPU8.subarray(bufferPtr, bufferPtr + BUF.length );
        bufferOfs.set(BUF);
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_query_run_buffer', ['number', 'number', 'number'], [conn, bufferPtr, BUF.length]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        const res = copyBuffer(this.mod, d, n);
        dropResponseBuffers(this.mod);
        this.mod._free(bufferPtr);
        return res;
    }
    /**
     *  Start a pending query asynchronously.
     *  This method returns either the arrow ipc schema or null.
     *  On null, the query has to be executed using `pollPendingQuery` until that returns != null.
     *  Results can then be fetched using `fetchQueryResults`
     */
    public startPendingQuery(conn: number, text: string): Uint8Array | null {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_pending_query_start', ['number', 'string'], [conn, text]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        if (d == 0) {
            return null;
        }
        const res = copyBuffer(this.mod, d, n);
        dropResponseBuffers(this.mod);
        return res;
    }
    /** Poll a pending query */
    public pollPendingQuery(conn: number): Uint8Array | null {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_pending_query_poll', ['number'], [conn]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        if (d == 0) {
            return null;
        }
        const res = copyBuffer(this.mod, d, n);
        dropResponseBuffers(this.mod);
        return res;
    }
    /** Cancel a pending query */
    public cancelPendingQuery(conn: number): boolean {
        return this.mod.ccall('duckdb_web_pending_query_cancel', 'boolean', ['number'], [conn]);
    }
    /** Fetch query results */
    public fetchQueryResults(conn: number): Uint8Array {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_query_fetch_results', ['number'], [conn]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        const res = copyBuffer(this.mod, d, n);
        dropResponseBuffers(this.mod);
        return res;
    }
    /** Get table names */
    public getTableNames(conn: number, text: string): string[] {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_get_tablenames', ['number', 'string'], [conn, text]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        const res = readString(this.mod, d, n);
        dropResponseBuffers(this.mod);
        return JSON.parse(res) as string[];
    }

    /** Create a scalar function */
    public createScalarFunction(
        conn: number,
        name: string,
        returns: arrow.DataType,
        func: (...args: any[]) => void,
    ): void {
        const decl: UDFFunctionDeclaration = {
            functionId: this._nextUDFId,
            name: name,
            returnType: arrowToSQLType(returns),
        };
        const def: UDFFunction = {
            functionId: decl.functionId,
            connectionId: conn,
            name: name,
            returnType: returns,
            func,
        };
        this._nextUDFId += 1;
        const [s, d, n] = callSRet(
            this.mod,
            'duckdb_web_udf_scalar_create',
            ['number', 'string'],
            [conn, JSON.stringify(decl)],
        );
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        dropResponseBuffers(this.mod);
        globalThis.DUCKDB_RUNTIME._udfFunctions = (globalThis.DUCKDB_RUNTIME._udfFunctions || new Map()).set(
            def.functionId,
            def,
        );
        if (this.pthread) {
            for (const worker of [...this.pthread.runningWorkers, ...this.pthread.unusedWorkers]) {
                worker.postMessage({
                    cmd: 'registerUDFFunction',
                    udf: def,
                });
            }
        }
    }

    /** Prepare a statement and return its identifier */
    public createPrepared(conn: number, text: string): number {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_prepared_create', ['number', 'string'], [conn, text]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        dropResponseBuffers(this.mod);
        return d;
    }

    /** Close a prepared statement */
    public closePrepared(conn: number, statement: number): void {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_prepared_close', ['number', 'number'], [conn, statement]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        dropResponseBuffers(this.mod);
    }

    /** Execute a prepared statement and return the full result */
    public runPrepared(conn: number, statement: number, params: any[]): Uint8Array {
        const [s, d, n] = callSRet(
            this.mod,
            'duckdb_web_prepared_run',
            ['number', 'number', 'string'],
            [conn, statement, JSON.stringify(params)],
        );
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        const res = copyBuffer(this.mod, d, n);
        dropResponseBuffers(this.mod);
        return res;
    }

    /** Execute a prepared statement and stream the result */
    public sendPrepared(conn: number, statement: number, params: any[]): Uint8Array {
        const [s, d, n] = callSRet(
            this.mod,
            'duckdb_web_prepared_send',
            ['number', 'number', 'string'],
            [conn, statement, JSON.stringify(params)],
        );
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        const res = copyBuffer(this.mod, d, n);
        dropResponseBuffers(this.mod);
        return res;
    }

    /** Insert record batches from an arrow ipc stream */
    public insertArrowFromIPCStream(conn: number, buffer: Uint8Array, options?: ArrowInsertOptions): void {
        if (buffer.length == 0) return;
        // Store buffer
        const bufferPtr = this.mod._malloc(buffer.length);
        const bufferOfs = this.mod.HEAPU8.subarray(bufferPtr, bufferPtr + buffer.length);
        bufferOfs.set(buffer);
        const optJSON = options ? JSON.stringify(options) : '';

        // Call wasm function
        const [s, d, n] = callSRet(
            this.mod,
            'duckdb_web_insert_arrow_from_ipc_stream',
            ['number', 'number', 'number', 'string'],
            [conn, bufferPtr, buffer.length, optJSON],
        );
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
    }

    /** Insert csv from path */
    public insertCSVFromPath(conn: number, path: string, options: CSVInsertOptions): void {
        // Stringify options
        if (options.columns !== undefined) {
            options.columnsFlat = [];
            for (const k in options.columns) {
                options.columnsFlat.push(arrowToSQLField(k, options.columns[k]));
            }
        }
        const opt = { ...options } as any;
        opt.columns = opt.columnsFlat;
        delete opt.columnsFlat;
        const optJSON = JSON.stringify(opt);

        // Call wasm function
        const [s, d, n] = callSRet(
            this.mod,
            'duckdb_web_insert_csv_from_path',
            ['number', 'string', 'string'],
            [conn, path, optJSON],
        );
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
    }
    /** Insert json from path */
    public insertJSONFromPath(conn: number, path: string, options: JSONInsertOptions): void {
        // Stringify options
        if (options.columns !== undefined) {
            options.columnsFlat = [];
            for (const k in options.columns) {
                options.columnsFlat.push(arrowToSQLField(k, options.columns[k]));
            }
        }
        const opt = { ...options } as any;
        opt.columns = opt.columnsFlat;
        delete opt.columnsFlat;
        const optJSON = JSON.stringify(opt);

        // Call wasm function
        const [s, d, n] = callSRet(
            this.mod,
            'duckdb_web_insert_json_from_path',
            ['number', 'string', 'string'],
            [conn, path, optJSON],
        );
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
    }
    /** Glob file infos */
    public globFiles(path: string): WebFile[] {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_fs_glob_file_infos', ['string'], [path]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        const infoStr = readString(this.mod, d, n);
        dropResponseBuffers(this.mod);
        const info = JSON.parse(infoStr) as WebFile[];
        if (info == null) {
            return [];
        }
        return info;
    }
    /** Register a file object URL */
    public registerFileURL(name: string, url: string, proto: DuckDBDataProtocol, directIO = false): void {
        if (url === undefined) {
            url = name;
        }
        const [s, d, n] = callSRet(
            this.mod,
            'duckdb_web_fs_register_file_url',
            ['string', 'string'],
            [name, url, proto, directIO],
        );
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        dropResponseBuffers(this.mod);
    }
    /** Register file text */
    public registerFileText(name: string, text: string): void {
        const buffer = TEXT_ENCODER.encode(text);
        this.registerFileBuffer(name, buffer);
    }
    /** Register a file buffer */
    public registerFileBuffer(name: string, buffer: Uint8Array): void {
        const ptr = this.mod._malloc(buffer.length);
        const dst = this.mod.HEAPU8.subarray(ptr, ptr + buffer.length);
        dst.set(buffer);
        const [s, d, n] = callSRet(
            this.mod,
            'duckdb_web_fs_register_file_buffer',
            ['string', 'number', 'number'],
            [name, ptr, buffer.length],
        );
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        dropResponseBuffers(this.mod);
    }
    /** Prepare a file handle that could only be acquired aschronously */
    public async prepareDBFileHandle(path: string, protocol: DuckDBDataProtocol): Promise<void> {
        if (protocol === DuckDBDataProtocol.BROWSER_FSACCESS && this._runtime.prepareDBFileHandle) {
            const list = await this._runtime.prepareDBFileHandle(path, DuckDBDataProtocol.BROWSER_FSACCESS);
            for (const item of list) {
                const { handle, path: filePath, fromCached } = item;
                if (!fromCached && handle.getSize()) {
                    await this.registerFileHandle(filePath, handle, DuckDBDataProtocol.BROWSER_FSACCESS, true);
                }
            }
            return;
        }
        throw new Error(`prepareDBFileHandle: unsupported protocol ${protocol}`);
    }
    /** Register a file object URL */
    public async registerFileHandle<HandleType>(
        name: string,
        handle: HandleType,
        protocol: DuckDBDataProtocol,
        directIO: boolean,
    ): Promise<void> {
        if (protocol === DuckDBDataProtocol.BROWSER_FSACCESS && handle instanceof FileSystemFileHandle) {
            // handle is an async handle, should convert to sync handle
            const fileHandle: FileSystemFileHandle = handle as any;
            handle = (await fileHandle.createSyncAccessHandle()) as any;
        }
        const [s, d, n] = callSRet(
            this.mod,
            'duckdb_web_fs_register_file_url',
            ['string', 'string', 'number', 'boolean'],
            [name, name, protocol, directIO],
        );
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        dropResponseBuffers(this.mod);
        globalThis.DUCKDB_RUNTIME._files = (globalThis.DUCKDB_RUNTIME._files || new Map()).set(name, handle);
        if (globalThis.DUCKDB_RUNTIME._preparedHandles?.[name]) {
            delete globalThis.DUCKDB_RUNTIME._preparedHandles[name];
        }
        if (this.pthread) {
            for (const worker of this.pthread.runningWorkers) {
                worker.postMessage({
                    cmd: 'registerFileHandle',
                    fileName: name,
                    fileHandle: handle,
                });
            }
            for (const worker of this.pthread.unusedWorkers) {
                worker.postMessage({
                    cmd: 'dropFileHandle',
                    fileName: name,
                });
            }
        }
    }
    /** Drop file */
    public dropFile(name: string): void {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_fs_drop_file', ['string'], [name]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        dropResponseBuffers(this.mod);
    }
    /** Drop files */
    public dropFiles(): void {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_fs_drop_files', [], []);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        dropResponseBuffers(this.mod);
    }
    /** Flush all files */
    public flushFiles(): void {
        this.mod.ccall('duckdb_web_flush_files', null, [], []);
    }
    /** Write a file to a path */
    public copyFileToPath(name: string, path: string): void {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_copy_file_to_path', ['string', 'string'], [name, path]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        dropResponseBuffers(this.mod);
    }
    /** Write a file to a buffer */
    public copyFileToBuffer(name: string): Uint8Array {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_copy_file_to_buffer', ['string'], [name]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        const buffer = this.mod.HEAPU8.subarray(d, d + n);
        const copy = new Uint8Array(buffer.length);
        copy.set(buffer);
        dropResponseBuffers(this.mod);
        return copy;
    }

    /** Enable tracking of file statistics */
    public collectFileStatistics(file: string, enable: boolean): void {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_collect_file_stats', ['string', 'boolean'], [file, enable]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
    }
    /** Export file statistics */
    public exportFileStatistics(file: string): FileStatistics {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_export_file_stats', ['string'], [file]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        return new FileStatistics(this.mod.HEAPU8.subarray(d, d + n));
    }
}
