import * as arrow from 'apache-arrow';
import { DuckDBBindings } from './bindings_interface';
import { CSVInsertOptions, JSONInsertOptions, ArrowInsertOptions } from './insert_options';
/** A thin helper to bind the connection id and talk record batches */
export declare class DuckDBConnection {
    /** The bindings */
    protected _bindings: DuckDBBindings;
    /** The connection handle */
    protected _conn: number;
    /** Constructor */
    constructor(bindings: DuckDBBindings, conn: number);
    /** Close a connection */
    close(): void;
    /** Brave souls may use this function to consume the underlying connection id */
    useUnsafe<R>(callback: (bindings: DuckDBBindings, conn: number) => R): R;
    /** Run a query */
    query<T extends {
        [key: string]: arrow.DataType;
    } = any>(text: string): arrow.Table<T>;
    /** Send a query */
    send<T extends {
        [key: string]: arrow.DataType;
    } = any>(text: string): Promise<arrow.RecordBatchStreamReader<T>>;
    /** Cancel a query that was sent earlier */
    cancelSent(): boolean;
    /** Get table names */
    getTableNames(query: string): string[];
    /** Create a prepared statement */
    prepare<T extends {
        [key: string]: arrow.DataType;
    } = any>(text: string): PreparedStatement;
    /** Create a scalar function */
    createScalarFunction(name: string, returns: arrow.DataType, func: (...args: any[]) => void): void;
    /** Insert an arrow table */
    insertArrowTable(table: arrow.Table, options: ArrowInsertOptions): void;
    /** Insert an arrow table from an ipc stream */
    insertArrowFromIPCStream(buffer: Uint8Array, options: ArrowInsertOptions): void;
    /** Inesrt csv file from path */
    insertCSVFromPath(path: string, options: CSVInsertOptions): void;
    /** Insert json file from path */
    insertJSONFromPath(path: string, options: JSONInsertOptions): void;
}
/** A result stream iterator */
export declare class ResultStreamIterator implements Iterable<Uint8Array> {
    protected bindings: DuckDBBindings;
    protected conn: number;
    protected header: Uint8Array;
    /** First chunk? */
    _first: boolean;
    /** Reached end of stream? */
    _depleted: boolean;
    constructor(bindings: DuckDBBindings, conn: number, header: Uint8Array);
    next(): IteratorResult<Uint8Array>;
    [Symbol.iterator](): this;
}
/** A thin helper to bind the prepared statement id*/
export declare class PreparedStatement<T extends {
    [key: string]: arrow.DataType;
} = any> {
    /** The bindings */
    protected readonly bindings: DuckDBBindings;
    /** The connection id */
    protected readonly connectionId: number;
    /** The statement id */
    protected readonly statementId: number;
    /** Constructor */
    constructor(bindings: DuckDBBindings, connectionId: number, statementId: number);
    /** Close a prepared statement */
    close(): void;
    /** Run a prepared statement */
    query(...params: any[]): arrow.Table<T>;
    /** Send a prepared statement */
    send(...params: any[]): arrow.RecordBatchStreamReader<T>;
}
