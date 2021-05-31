import { DuckDBModule } from './duckdb_module';
import { Logger } from '../log';
import { DuckDBConnection } from './connection';
import { StatusCode } from '../status';
import { DuckDBRuntime } from './runtime_base';
import { CSVTableOptions } from './table_options';

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
        this._runtime.bindings = this;
    }

    /** Get the logger */
    public get logger(): Logger {
        return this._logger;
    }
    /** Get the instance */
    public get instance(): DuckDBModule | null {
        return this._instance;
    }

    /// Instantiate the module
    protected abstract instantiate(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule>;

    /// Drop a file by url
    public dropFile(url: string): void {
        return this._runtime.duckdb_web_drop_file(url);
    }
    /// Drop a file by url
    public dropFiles(): void {
        return this._runtime.duckdb_web_drop_files();
    }
    /// Add file path
    public addFilePath(url: string, path: string): number {
        return this._runtime.duckdb_web_add_file_path(url, path);
    }
    /// Add file blob
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public addFileBlob(url: string, data: any): number {
        return this._runtime.duckdb_web_add_file_blob(url, data);
    }
    /// Add file buffer
    public addFileBuffer(url: string, buffer: Uint8Array): number {
        return this._runtime.duckdb_web_add_file_buffer(url, buffer);
    }
    /// Get the file path
    public getFilePath(fileId: number): string | null {
        return this._runtime.duckdb_web_get_file_path(fileId);
    }
    /// Get the file object URL
    public getFileObjectURL(fileId: number): string | null {
        const path = this._runtime.duckdb_web_get_file_path(fileId);
        if (!path) return null;
        this.instance!.ccall('duckdb_web_flush_file', null, ['string'], [path]);
        return this._runtime.duckdb_web_get_file_object_url(fileId);
    }
    /// Get the file buffer
    public getFileBuffer(fileId: number): Uint8Array | null {
        const path = this._runtime.duckdb_web_get_file_path(fileId);
        if (!path) return null;
        this.instance!.ccall('duckdb_web_flush_file', null, ['string'], [path]);
        return this._runtime.duckdb_web_get_file_buffer(fileId);
    }

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

    // Call a core function with packed response buffer
    public callSRet(funcName: string, argTypes: Array<Emscripten.JSType>, args: Array<any>): [number, number, number] {
        // Save the stack
        const instance = this._instance!;
        const stackPointer = instance.stackSave();

        // Allocate the packed response buffer
        const response = instance.stackAlloc(3 * 8);
        argTypes.unshift('number');
        args.unshift(response);

        // Do the call
        instance.ccall(funcName, null, argTypes, args);

        // Read the response
        const status = instance.HEAPF64[(response >> 3) + 0];
        const data = instance.HEAPF64[(response >> 3) + 1];
        const dataSize = instance.HEAPF64[(response >> 3) + 2];

        // Restore the stack
        instance.stackRestore(stackPointer);
        return [status, data, dataSize];
    }

    /** Delete response buffers */
    public dropResponseBuffers(): void {
        this.instance!.ccall('duckdb_web_clear_response', null, [], []);
    }

    /** Decode a string */
    public readString(begin: number, length: number): string {
        const decoder = new TextDecoder();
        return decoder.decode(this.instance!.HEAPU8.subarray(begin, begin + length));
    }

    /** Copy a Uint8Array */
    public copyBuffer(begin: number, length: number): Uint8Array {
        const buffer = this.instance!.HEAPU8.subarray(begin, begin + length);
        const copy = new Uint8Array(new ArrayBuffer(buffer.byteLength));
        copy.set(buffer);
        return copy;
    }

    /** Flush all files */
    public flushFiles(): void {
        this.instance!.ccall('duckdb_web_flush_files', null, [], []);
    }

    /** Get the version */
    public getVersion(): string {
        const [s, d, n] = this.callSRet('duckdb_web_get_version', [], []);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(this.readString(d, n));
        }
        const version = this.readString(d, n);
        this.dropResponseBuffers();
        return version;
    }

    /** Get the feature flags */
    public getFeatureFlags(): number {
        return this._instance!.ccall('duckdb_web_get_feature_flags', 'number', [], []);
    }

    /** Connect to database */
    public connect(): DuckDBConnection {
        const instance = this._instance!;
        const conn = instance.ccall('duckdb_web_connect', 'number', [], []);
        return new DuckDBConnection(this, conn);
    }

    /** Disconnect from database */
    public disconnect(conn: number): void {
        this.instance!.ccall('duckdb_web_disconnect', null, ['number'], [conn]);
    }

    /** Send a query and return the full result */
    public runQuery(conn: number, text: string): Uint8Array {
        const [s, d, n] = this.callSRet('duckdb_web_query_run', ['number', 'string'], [conn, text]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(this.readString(d, n));
        }
        const res = this.copyBuffer(d, n);
        this.dropResponseBuffers();
        return res;
    }

    /** Send a query asynchronously. Results have to be fetched with `fetchQueryResults` */
    public sendQuery(conn: number, text: string): Uint8Array {
        const [s, d, n] = this.callSRet('duckdb_web_query_send', ['number', 'string'], [conn, text]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(this.readString(d, n));
        }
        const res = this.copyBuffer(d, n);
        this.dropResponseBuffers();
        return res;
    }

    /** Fetch query results */
    public fetchQueryResults(conn: number): Uint8Array {
        const [s, d, n] = this.callSRet('duckdb_web_query_fetch_results', ['number'], [conn]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(this.readString(d, n));
        }
        const res = this.copyBuffer(d, n);
        this.dropResponseBuffers();
        return res;
    }

    /** Import csv from path */
    public importCSVFromPath(conn: number, path: string, options: CSVTableOptions): void {
        const optionsJSON = JSON.stringify(options);
        const [s, d, n] = this.callSRet(
            'duckdb_web_import_csv_table',
            ['number', 'string', 'string'],
            [conn, path, optionsJSON],
        );
        if (s !== StatusCode.SUCCESS) {
            throw new Error(this.readString(d, n));
        }
    }

    /** Import json from path */
    public importJSONFromPath(conn: number, path: string, options: CSVTableOptions): void {
        const optionsJSON = JSON.stringify(options);
        const [s, d, n] = this.callSRet(
            'duckdb_web_import_json_table',
            ['number', 'string', 'string'],
            [conn, path, optionsJSON],
        );
        if (s !== StatusCode.SUCCESS) {
            throw new Error(this.readString(d, n));
        }
    }
}
