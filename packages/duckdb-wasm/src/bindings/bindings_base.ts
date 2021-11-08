import { DuckDBModule, PThread } from './duckdb_module';
import { DuckDBConfig } from './config';
import { Logger } from '../log';
import { DuckDBBindings } from './bindings_interface';
import { DuckDBConnection } from './connection';
import { StatusCode } from '../status';
import { dropResponseBuffers, DuckDBRuntime, readString, callSRet, copyBuffer } from './runtime';
import { CSVInsertOptions, JSONInsertOptions, ArrowInsertOptions } from './insert_options';
import { ScriptTokens } from './tokens';
import { FileStatistics } from './file_stats';
import { flattenArrowField } from '../flat_arrow';
import { WebFile } from './web_file';

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

    constructor(logger: Logger, runtime: DuckDBRuntime) {
        this._logger = logger;
        this._runtime = runtime;
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
    /** Instantiate the database */
    public async instantiate(): Promise<this> {
        // Already opened?
        if (this._instance != null) {
            return this;
        }
        // Open in progress?
        if (this._initPromise != null) {
            await this._initPromise;
        }

        // Create a promise that we can await
        this._initPromise = new Promise(resolve => {
            this._initPromiseResolver = resolve;
        });

        // Initialize duckdb
        this._instance = await this.instantiateImpl({
            print: console.log.bind(console),
            printErr: console.log.bind(console),
            onRuntimeInitialized: this._initPromiseResolver,
        });

        // Wait for onRuntimeInitialized
        await this._initPromise;
        this._initPromise = null;

        return this;
    }
    /** Open a database at a path */
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
    }

    /** Send a query and return the full result */
    public runQuery(conn: number, text: string): Uint8Array {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_query_run', ['number', 'string'], [conn, text]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        const res = copyBuffer(this.mod, d, n);
        dropResponseBuffers(this.mod);
        return res;
    }
    /** Send a query asynchronously. Results have to be fetched with `fetchQueryResults` */
    public sendQuery(conn: number, text: string): Uint8Array {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_query_send', ['number', 'string'], [conn, text]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        const res = copyBuffer(this.mod, d, n);
        dropResponseBuffers(this.mod);
        return res;
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
                options.columnsFlat.push(flattenArrowField(k, options.columns[k]));
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
                options.columnsFlat.push(flattenArrowField(k, options.columns[k]));
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
    public registerFileURL(name: string, url?: string): void {
        if (url === undefined) {
            url = name;
        }
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_fs_register_file_url', ['string', 'string'], [name, url]);
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
    /** Register a file object URL */
    public registerFileHandle<HandleType>(name: string, handle: HandleType): void {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_fs_register_file_url', ['string', 'string'], [name, name]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        dropResponseBuffers(this.mod);
        globalThis.DUCKDB_RUNTIME._files = (globalThis.DUCKDB_RUNTIME._files || new Map()).set(name, handle);
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
    public dropFile(name: string): boolean {
        return this.mod.ccall('duckdb_web_fs_drop_file', 'boolean', ['string'], [name]);
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
