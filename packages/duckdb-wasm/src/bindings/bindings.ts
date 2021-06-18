import { DuckDBModule } from './duckdb_module';
import { Logger } from '../log';
import { DuckDBConnection } from './connection';
import { StatusCode } from '../status';
import { dropResponseBuffers, DuckDBRuntime, readString, callSRet, copyBuffer } from './runtime';
import { CSVTableOptions } from './table_options';
import { ScriptTokens } from './tokens';

/** A DuckDB Feature */
export enum DuckDBFeature {
    FAST_EXCEPTIONS = 1 << 0,
    THREADS = 1 << 1,
}

/** The proxy for either the browser- order node-based DuckDB API */
export abstract class DuckDBBindings {
    /** The logger */
    private _logger: Logger;
    /** The instance */
    private _instance: DuckDBModule | null = null;
    /** The loading promise */
    private _openPromise: Promise<void> | null = null;
    /** The resolver for the open promise (called by onRuntimeInitialized) */
    private _openPromiseResolver: () => void = () => {};
    /** Backend-dependent native-glue code for DuckDB */
    protected _runtime: DuckDBRuntime;

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

    /** Instantiate the module */
    protected abstract instantiate(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule>;

    /** Open the database */
    public async open(): Promise<void> {
        // Already opened?
        if (this._instance != null) {
            return;
        }
        // Open in progress?
        if (this._openPromise != null) {
            await this._openPromise;
        }

        // Create a promise that we can await
        this._openPromise = new Promise(resolve => {
            this._openPromiseResolver = resolve;
        });

        // Initialize duckdb
        this._instance = await this.instantiate({
            print: console.log.bind(console),
            printErr: console.log.bind(console),
            onRuntimeInitialized: this._openPromiseResolver,
        });

        // Wait for onRuntimeInitialized
        await this._openPromise;
        this._openPromise = null;
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

    /** Drop file */
    public dropFile(name: string): boolean {
        return this.mod.ccall('duckdb_web_fs_drop_file', 'boolean', ['string'], [name]);
    }
    /** Drop files */
    public dropFiles(): void {
        this.mod.ccall('duckdb_web_fs_drop_files', null, [], []);
    }
    /** Flush all files */
    public flushFiles(): void {
        this.mod.ccall('duckdb_web_flush_files', null, [], []);
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
        return this._instance!.ccall('duckdb_web_get_feature_flags', 'number', [], []);
    }

    /** Enable tracking of file statistics */
    public enableFileStatistics(file: string, enable: boolean): void {
        const [s, d, n] = this._instance!.ccall(
            'duckdb_web_enable_file_stats',
            null,
            ['string', 'boolean'],
            [file, enable],
        );
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
    }
    /** Export block statistics */
    public exportFileBlockStatistics(file: string): Uint16Array {
        const [s, d, n] = this._instance!.ccall('duckdb_web_export_file_block_stats', null, ['string'], [file]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        const res = copyBuffer(this.mod, d, n);
        return new Uint16Array(res.buffer);
    }

    /** Connect to database */
    public connect(): DuckDBConnection {
        const instance = this._instance!;
        const conn = instance.ccall('duckdb_web_connect', 'number', [], []);
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

    /** Import csv from path */
    public importCSVFromPath(conn: number, path: string, options: CSVTableOptions): void {
        const optionsJSON = JSON.stringify(options);
        const [s, d, n] = callSRet(
            this.mod,
            'duckdb_web_import_csv_table',
            ['number', 'string', 'string'],
            [conn, path, optionsJSON],
        );
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
    }

    /** Import json from path */
    public importJSONFromPath(conn: number, path: string, options: CSVTableOptions): void {
        const optionsJSON = JSON.stringify(options);
        const [s, d, n] = callSRet(
            this.mod,
            'duckdb_web_import_json_table',
            ['number', 'string', 'string'],
            [conn, path, optionsJSON],
        );
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
    }

    /** Add a file object URL */
    public registerFileURL(name: string, url: string): void {
        const [s, d, n] = callSRet(this.mod, 'duckdb_web_fs_register_file_url', ['string', 'string'], [name, url]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(this.mod, d, n));
        }
        dropResponseBuffers(this.mod);
    }
    /** Add a file buffer */
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
}
