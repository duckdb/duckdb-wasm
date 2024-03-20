import * as arrow from 'apache-arrow';
import { AsyncDuckDB } from './async_bindings';
import { ArrowInsertOptions, CSVInsertOptions, JSONInsertOptions } from '../bindings/insert_options';
/** A thin helper to memoize the connection id */
export declare class AsyncDuckDBConnection {
    /** The async duckdb */
    protected readonly _bindings: AsyncDuckDB;
    /** The conn handle */
    protected readonly _conn: number;
    constructor(bindings: AsyncDuckDB, conn: number);
    /** Access the database bindings */
    get bindings(): AsyncDuckDB;
    /** Disconnect from the database */
    close(): Promise<void>;
    /** Brave souls may use this function to consume the underlying connection id */
    useUnsafe<R>(callback: (bindings: AsyncDuckDB, conn: number) => R): R;
    /** Run a query */
    query<T extends {
        [key: string]: arrow.DataType;
    } = any>(text: string): Promise<arrow.Table<T>>;
    /** Send a query */
    send<T extends {
        [key: string]: arrow.DataType;
    } = any>(text: string): Promise<arrow.AsyncRecordBatchStreamReader<T>>;
    /** Cancel a query that was sent earlier */
    cancelSent(): Promise<boolean>;
    /** Get table names */
    getTableNames(query: string): Promise<string[]>;
    /** Create a prepared statement */
    prepare<T extends {
        [key: string]: arrow.DataType;
    } = any>(text: string): Promise<AsyncPreparedStatement>;
    /** Insert an arrow table */
    insertArrowTable(table: arrow.Table, options: ArrowInsertOptions): Promise<void>;
    /** Insert an arrow table from an ipc stream */
    insertArrowFromIPCStream(buffer: Uint8Array, options: ArrowInsertOptions): Promise<void>;
    /** Insert csv file from path */
    insertCSVFromPath(text: string, options: CSVInsertOptions): Promise<void>;
    /** Insert json file from path */
    insertJSONFromPath(text: string, options: JSONInsertOptions): Promise<void>;
}
/** An async result stream iterator */
export declare class AsyncResultStreamIterator implements AsyncIterable<Uint8Array> {
    protected readonly db: AsyncDuckDB;
    protected readonly conn: number;
    protected readonly header: Uint8Array;
    /** First chunk? */
    protected _first: boolean;
    /** Reached end of stream? */
    protected _depleted: boolean;
    /** In-flight */
    protected _inFlight: Promise<Uint8Array> | null;
    constructor(db: AsyncDuckDB, conn: number, header: Uint8Array);
    next(): Promise<IteratorResult<Uint8Array>>;
    [Symbol.asyncIterator](): this;
}
/** A thin helper to bind the prepared statement id */
export declare class AsyncPreparedStatement<T extends {
    [key: string]: arrow.DataType;
} = any> {
    /** The bindings */
    protected readonly bindings: AsyncDuckDB;
    /** The connection id */
    protected readonly connectionId: number;
    /** The statement id */
    protected readonly statementId: number;
    /** Constructor */
    constructor(bindings: AsyncDuckDB, connectionId: number, statementId: number);
    /** Close a prepared statement */
    close(): Promise<void>;
    /** Run a prepared statement */
    query(...params: any[]): Promise<arrow.Table<T>>;
    /** Send a prepared statement */
    send(...params: any[]): Promise<arrow.AsyncRecordBatchStreamReader<T>>;
}
