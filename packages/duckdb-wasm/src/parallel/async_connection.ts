import * as arrow from 'apache-arrow';
import { AsyncDuckDB } from './async_bindings';
import { LogLevel, LogTopic, LogOrigin, LogEvent } from '../log';
import { ArrowInsertOptions, CSVInsertOptions, JSONInsertOptions } from '../bindings/insert_options';

/** A thin helper to memoize the connection id */
export class AsyncDuckDBConnection {
    /** The async duckdb */
    protected readonly _bindings: AsyncDuckDB;
    /** The conn handle */
    protected readonly _conn: number;

    constructor(bindings: AsyncDuckDB, conn: number) {
        this._bindings = bindings;
        this._conn = conn;
    }

    /** Access the database bindings */
    public get bindings(): AsyncDuckDB {
        return this._bindings;
    }

    /** Disconnect from the database */
    public async close(): Promise<void> {
        return this._bindings.disconnect(this._conn);
    }

    /** Brave souls may use this function to consume the underlying connection id */
    public useUnsafe<R>(callback: (bindings: AsyncDuckDB, conn: number) => R) {
        return callback(this._bindings, this._conn);
    }

    /** Run a query */
    public async query<T extends { [key: string]: arrow.DataType } = any>(text: string): Promise<arrow.Table<T>> {
        this._bindings.logger.log({
            timestamp: new Date(),
            level: LogLevel.INFO,
            origin: LogOrigin.ASYNC_DUCKDB,
            topic: LogTopic.QUERY,
            event: LogEvent.RUN,
            value: text,
        });
        const buffer = await this._bindings.runQuery(this._conn, text);
        const reader = arrow.RecordBatchReader.from<T>(buffer);
        console.assert(reader.isSync(), 'Reader is not sync');
        console.assert(reader.isFile(), 'Reader is not file');
        return new arrow.Table(reader as arrow.RecordBatchFileReader);
    }

    /** Send a query */
    public async send<T extends { [key: string]: arrow.DataType } = any>(
        text: string,
        allowStreamResult: boolean = false,
    ): Promise<arrow.AsyncRecordBatchStreamReader<T>> {
        this._bindings.logger.log({
            timestamp: new Date(),
            level: LogLevel.INFO,
            origin: LogOrigin.ASYNC_DUCKDB,
            topic: LogTopic.QUERY,
            event: LogEvent.RUN,
            value: text,
        });
        let header = await this._bindings.startPendingQuery(this._conn, text, allowStreamResult);
        while (header == null) {
            // Avoid infinite loop on detached state
            if (this._bindings.isDetached()) {
                console.error('cannot send a message since the worker is not set!');
                return undefined as any;
            }
            header = await this._bindings.pollPendingQuery(this._conn);
        }
        const iter = new AsyncResultStreamIterator(this._bindings, this._conn, header);
        const reader = await arrow.RecordBatchReader.from<T>(iter);
        console.assert(reader.isAsync());
        console.assert(reader.isStream());
        return reader as unknown as arrow.AsyncRecordBatchStreamReader<T>; // XXX
    }

    /** Cancel a query that was sent earlier */
    public async cancelSent(): Promise<boolean> {
        return await this._bindings.cancelPendingQuery(this._conn);
    }

    /** Get table names */
    public async getTableNames(query: string): Promise<string[]> {
        return await this._bindings.getTableNames(this._conn, query);
    }

    /** Create a prepared statement */
    public async prepare<T extends { [key: string]: arrow.DataType } = any>(
        text: string,
    ): Promise<AsyncPreparedStatement<T>> {
        const stmt = await this._bindings.createPrepared(this._conn, text);
        return new AsyncPreparedStatement<T>(this._bindings, this._conn, stmt);
    }

    /** Insert an arrow table */
    public async insertArrowTable(table: arrow.Table, options: ArrowInsertOptions): Promise<void> {
        const buffer = arrow.tableToIPC(table, 'stream');
        await this.insertArrowFromIPCStream(buffer, options);
    }
    /** Insert an arrow table from an ipc stream */
    public async insertArrowFromIPCStream(buffer: Uint8Array, options: ArrowInsertOptions): Promise<void> {
        await this._bindings.insertArrowFromIPCStream(this._conn, buffer, options);
    }
    /** Insert csv file from path */
    public async insertCSVFromPath(text: string, options: CSVInsertOptions): Promise<void> {
        await this._bindings.insertCSVFromPath(this._conn, text, options);
    }
    /** Insert json file from path */
    public async insertJSONFromPath(text: string, options: JSONInsertOptions): Promise<void> {
        await this._bindings.insertJSONFromPath(this._conn, text, options);
    }
}

/** An async result stream iterator */
export class AsyncResultStreamIterator implements AsyncIterable<Uint8Array> {
    /** First chunk? */
    protected _first: boolean;
    /** Reached end of stream? */
    protected _depleted: boolean;
    /** In-flight */
    protected _inFlight: Promise<Uint8Array | null> | null;

    constructor(
        protected readonly db: AsyncDuckDB,
        protected readonly conn: number,
        protected readonly header: Uint8Array,
    ) {
        this._first = true;
        this._depleted = false;
        this._inFlight = null;
    }

    async next(): Promise<IteratorResult<Uint8Array>> {
        if (this._first) {
            this._first = false;
            return { done: false, value: this.header };
        }
        if (this._depleted) {
            return { done: true, value: null };
        }
        let buffer: Uint8Array | null = null;
        if (this._inFlight != null) {
            buffer = await this._inFlight;
            this._inFlight = null;
        }

        while (buffer == null) {
            buffer = await this.db.fetchQueryResults(this.conn);
        }

        this._depleted = buffer.length == 0;
        if (!this._depleted) {
            this._inFlight = this.db.fetchQueryResults(this.conn);
        }

        return {
            done: this._depleted,
            value: buffer,
        };
    }

    [Symbol.asyncIterator]() {
        return this;
    }
}

/** A thin helper to bind the prepared statement id */
export class AsyncPreparedStatement<T extends { [key: string]: arrow.DataType } = any> {
    /** The bindings */
    protected readonly bindings: AsyncDuckDB;
    /** The connection id */
    protected readonly connectionId: number;
    /** The statement id */
    protected readonly statementId: number;

    /** Constructor */
    constructor(bindings: AsyncDuckDB, connectionId: number, statementId: number) {
        this.bindings = bindings;
        this.connectionId = connectionId;
        this.statementId = statementId;
    }

    /** Close a prepared statement */
    public async close() {
        await this.bindings.closePrepared(this.connectionId, this.statementId);
    }

    /** Run a prepared statement */
    public async query(...params: any[]): Promise<arrow.Table<T>> {
        const buffer = await this.bindings.runPrepared(this.connectionId, this.statementId, params);
        const reader = arrow.RecordBatchReader.from<T>(buffer);
        console.assert(reader.isSync());
        console.assert(reader.isFile());
        return new arrow.Table(reader as arrow.RecordBatchFileReader);
    }

    /** Send a prepared statement */
    public async send(...params: any[]): Promise<arrow.AsyncRecordBatchStreamReader<T>> {
        const header = await this.bindings.sendPrepared(this.connectionId, this.statementId, params);
        const iter = new AsyncResultStreamIterator(this.bindings, this.connectionId, header);
        const reader = await arrow.RecordBatchReader.from<T>(iter);
        console.assert(reader.isAsync());
        console.assert(reader.isStream());
        return reader as unknown as arrow.AsyncRecordBatchStreamReader<T>; // XXX
    }
}
