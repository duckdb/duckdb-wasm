import { Logger, LogLevel, LogTopic, LogOrigin, LogEvent } from '../log';
import * as arrow from 'apache-arrow';
import { ArrowInsertOptions, CSVInsertOptions, JSONInsertOptions } from '../bindings/insert_options';

interface IAsyncDuckDB {
    logger: Logger;

    registerFileURL(name: string, url: string, size: number): Promise<void>;
    registerFileBuffer(name: string, buffer: Uint8Array): Promise<void>;
    registerFileHandle<HandleType>(name: string, handle: HandleType): Promise<void>;
    copyFileToPath(name: string, out: string): Promise<void>;
    copyFileToBuffer(name: string): Promise<Uint8Array>;

    disconnect(conn: number): Promise<void>;
    runQuery(conn: number, text: string): Promise<Uint8Array>;
    sendQuery(conn: number, text: string): Promise<Uint8Array>;
    fetchQueryResults(conn: number): Promise<Uint8Array>;

    insertArrowFromIPCStream(conn: number, buffer: Uint8Array, options: CSVInsertOptions): Promise<void>;
    insertCSVFromPath(conn: number, path: string, options: CSVInsertOptions): Promise<void>;
    insertJSONFromPath(conn: number, path: string, options: JSONInsertOptions): Promise<void>;
}

/** An async result stream iterator */
class ResultStreamIterator implements AsyncIterable<Uint8Array> {
    /** First chunk? */
    protected _first: boolean;
    /** Reached end of stream? */
    protected _depleted: boolean;

    constructor(
        protected readonly db: IAsyncDuckDB,
        protected readonly conn: number,
        protected readonly header: Uint8Array,
    ) {
        this._first = true;
        this._depleted = false;
    }

    async next(): Promise<IteratorResult<Uint8Array>> {
        if (this._first) {
            this._first = false;
            return { done: false, value: this.header };
        }
        if (this._depleted) {
            return { done: true, value: null };
        }
        const bufferI8 = await this.db.fetchQueryResults(this.conn);
        this._depleted = bufferI8.length == 0;
        return {
            done: this._depleted,
            value: bufferI8,
        };
    }

    [Symbol.asyncIterator]() {
        return this;
    }
}

/** An async connection. */
/** This interface will enable us to swap duckdb with a native version. */
export interface AsyncConnection {
    /** The database instance */
    readonly instance: IAsyncDuckDB;

    /** Disconnect from the database */
    close(): Promise<void>;
    /** Run a query */
    runQuery<T extends { [key: string]: arrow.DataType } = any>(text: string): Promise<arrow.Table<T>>;
    /** Send a query */
    sendQuery<T extends { [key: string]: arrow.DataType } = any>(
        text: string,
    ): Promise<arrow.AsyncRecordBatchStreamReader<T>>;
    /** Insert arrow from an IPC stream */
    insertArrowFromIPCStream(buffer: Uint8Array, options: ArrowInsertOptions): Promise<void>;
    /** Insert json file from path */
    insertCSVFromPath(text: string, options: CSVInsertOptions): Promise<void>;
    /** Insert csv file from path */
    insertJSONFromPath(text: string, options: JSONInsertOptions): Promise<void>;
}

/** A thin helper to memoize the connection id */
export class AsyncDuckDBConnection implements AsyncConnection {
    /** The async duckdb */
    protected readonly _instance: IAsyncDuckDB;
    /** The conn handle */
    protected readonly _conn: number;

    constructor(instance: IAsyncDuckDB, conn: number) {
        this._instance = instance;
        this._conn = conn;
    }

    /** Access the database instance */
    public get instance(): IAsyncDuckDB {
        return this._instance;
    }

    /** Disconnect from the database */
    public async close(): Promise<void> {
        return this._instance.disconnect(this._conn);
    }

    /** Run a query */
    public async runQuery<T extends { [key: string]: arrow.DataType } = any>(text: string): Promise<arrow.Table<T>> {
        this._instance.logger.log({
            timestamp: new Date(),
            level: LogLevel.INFO,
            origin: LogOrigin.ASYNC_DUCKDB,
            topic: LogTopic.QUERY,
            event: LogEvent.RUN,
            value: text,
        });
        const buffer = await this._instance.runQuery(this._conn, text);
        const reader = arrow.RecordBatchReader.from<T>(buffer);
        console.assert(reader.isSync());
        console.assert(reader.isFile());
        return arrow.Table.from(reader as arrow.RecordBatchFileReader);
    }

    /** Send a query */
    public async sendQuery<T extends { [key: string]: arrow.DataType } = any>(
        text: string,
    ): Promise<arrow.AsyncRecordBatchStreamReader<T>> {
        this._instance.logger.log({
            timestamp: new Date(),
            level: LogLevel.INFO,
            origin: LogOrigin.ASYNC_DUCKDB,
            topic: LogTopic.QUERY,
            event: LogEvent.RUN,
            value: text,
        });
        const header = await this._instance.sendQuery(this._conn, text);
        const iter = new ResultStreamIterator(this._instance, this._conn, header);
        const reader = await arrow.RecordBatchReader.from<T>(iter);
        console.assert(reader.isAsync());
        console.assert(reader.isStream());
        return reader as unknown as arrow.AsyncRecordBatchStreamReader<T>; // XXX
    }

    /** Import arrow from ipc stream */
    public async insertArrowFromIPCStream(buffer: Uint8Array, options: ArrowInsertOptions): Promise<void> {
        await this._instance.insertArrowFromIPCStream(this._conn, buffer, options);
    }
    /** Import csv file from path */
    public async insertCSVFromPath(text: string, options: CSVInsertOptions): Promise<void> {
        await this._instance.insertCSVFromPath(this._conn, text, options);
    }
    /** Import json file from path */
    public async insertJSONFromPath(text: string, options: JSONInsertOptions): Promise<void> {
        await this._instance.insertJSONFromPath(this._conn, text, options);
    }
}
