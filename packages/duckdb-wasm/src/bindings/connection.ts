import * as arrow from 'apache-arrow';
import { CSVInsertOptions, JSONInsertOptions, ArrowInsertOptions } from './insert_options';

interface IDuckDBBindings {
    disconnect(conn: number): void;
    runQuery(conn: number, text: string): Uint8Array;
    sendQuery(conn: number, text: string): Uint8Array;
    createPreparedStatement(conn: number, text: string): number;
    runPreparedStatement(conn: number, statement: number, params: any[]): Uint8Array;
    sendPreparedStatement(conn: number, statement: number, params: any[]): Uint8Array;
    closePreparedStatement(conn: number, statement: number): void;
    fetchQueryResults(conn: number): Uint8Array;
    insertArrowFromIPCStream(conn: number, buffer: Uint8Array, options?: ArrowInsertOptions): void;
    insertCSVFromPath(conn: number, path: string, options: CSVInsertOptions): void;
    insertJSONFromPath(conn: number, path: string, options: JSONInsertOptions): void;
}

/** A result stream iterator */
class ResultStreamIterator implements Iterable<Uint8Array> {
    /** First chunk? */
    _first: boolean;
    /** Reached end of stream? */
    _depleted: boolean;

    constructor(protected bindings: IDuckDBBindings, protected conn: number, protected header: Uint8Array) {
        this._first = true;
        this._depleted = false;
    }

    next(): IteratorResult<Uint8Array> {
        if (this._first) {
            this._first = false;
            return { done: false, value: this.header };
        }
        if (this._depleted) {
            return { done: true, value: null };
        }
        const bufferI8 = this.bindings.fetchQueryResults(this.conn);
        this._depleted = bufferI8.length == 0;
        return {
            done: this._depleted,
            value: bufferI8,
        };
    }

    [Symbol.iterator]() {
        return this;
    }
}

/** A thin helper to bind the connection id and talk record batches */
export class DuckDBConnection {
    /** The bindings */
    protected _bindings: IDuckDBBindings;
    /** The connection handle */
    protected _conn: number;

    /** Constructor */
    constructor(bindings: IDuckDBBindings, conn: number) {
        this._bindings = bindings;
        this._conn = conn;
    }

    /** Get the connection helper */
    public get handle(): number {
        return this._conn;
    }

    /** Close a connection */
    public close(): void {
        this._bindings.disconnect(this._conn);
    }

    /** Run a query */
    public runQuery<T extends { [key: string]: arrow.DataType } = any>(text: string): arrow.Table<T> {
        const buffer = this._bindings.runQuery(this._conn, text);
        const reader = arrow.RecordBatchReader.from<T>(buffer);
        console.assert(reader.isSync());
        console.assert(reader.isFile());
        return arrow.Table.from(reader);
    }

    /** Send a query */
    public sendQuery<T extends { [key: string]: arrow.DataType } = any>(
        text: string,
    ): arrow.RecordBatchStreamReader<T> {
        const header = this._bindings.sendQuery(this._conn, text);
        const iter = new ResultStreamIterator(this._bindings, this._conn, header);
        const reader = arrow.RecordBatchReader.from<T>(iter);
        console.assert(reader.isSync());
        console.assert(reader.isStream());
        return reader;
    }

    /** Create a prepared statement */
    public createPreparedStatement(text: string): number {
        return this._bindings.createPreparedStatement(this._conn, text);
    }

    /** Close a prepared statement */
    public closePreparedStatement(statement: number): void {
        this._bindings.closePreparedStatement(this._conn, statement);
    }

    /** Run a prepared statement */
    public runPreparedStatement<T extends { [key: string]: arrow.DataType } = any>(
        statement: number,
        params: any[],
    ): arrow.Table<T> {
        const buffer = this._bindings.runPreparedStatement(this._conn, statement, params);
        const reader = arrow.RecordBatchReader.from<T>(buffer);
        console.assert(reader.isSync());
        console.assert(reader.isFile());
        return arrow.Table.from(reader as arrow.RecordBatchFileReader);
    }

    /** Send a prepared statement */
    public sendPreparedStatement<T extends { [key: string]: arrow.DataType } = any>(
        statement: number,
        params: any[],
    ): arrow.RecordBatchStreamReader<T> {
        const header = this._bindings.sendPreparedStatement(this._conn, statement, params);
        const iter = new ResultStreamIterator(this._bindings, this._conn, header);
        const reader = arrow.RecordBatchReader.from<T>(iter);
        console.assert(reader.isSync());
        console.assert(reader.isStream());
        return reader as arrow.RecordBatchStreamReader;
    }

    /** Insert record batches */
    public insertArrowBatches(
        schema: arrow.Schema,
        batches: Iterable<arrow.RecordBatch>,
        options: ArrowInsertOptions,
    ): void {
        /// Warn the user about an empty schema.
        if (schema.fields.length == 0) {
            console.warn(
                'The schema is empty! If you used arrow.Table.from, consider constructing schema and batches manually',
            );
        }

        // Prepare the IPC stream writer
        const buffer = new arrow.AsyncByteQueue();
        const writer = new arrow.RecordBatchStreamWriter().reset(buffer, schema);

        // We actually would like to stream the batches over into the wasm memory BUT:
        //  https://github.com/apache/arrow/blob/612a759d554b838aa201fe08ab357272a6cb1843/js/src/ipc/writer.ts#L161
        //  https://github.com/apache/arrow/blob/612a759d554b838aa201fe08ab357272a6cb1843/js/src/io/stream.ts#L35
        //
        // Arrow uses an AsyncIterable for the individual batch chunks even though the AsyncByteQueue is only a Uint8Array[].
        // We therefore end up awaiting 5 (!!) Uint8Arrays for a single Record Batch insert!
        //
        // This is not quite acceptable in the synchronous case.
        // If we want to shoot small queries at an asynchronous DuckDB we ideally want to await only 1 promise...

        // We therefore pay the price for materializing everything on the js side for now.
        // toUint8Array will actually just merge the Uint8Array[].
        // This merge is an unnecessary copy but at least without a promise.

        // When AsyncByteQueue implements Iterable<Uint8Array>, we can send all chunks directly with:
        // this._bindings.insertArrowFromIPCStream(this._conn, chunk, first ? options : undefined);

        writer.writeAll(batches);
        writer.close();
        const unecessary_copy = writer.toUint8Array(true);
        this._bindings.insertArrowFromIPCStream(this._conn, unecessary_copy, options);
    }
    /** Inesrt csv file from path */
    public insertCSVFromPath(path: string, options: CSVInsertOptions): void {
        this._bindings.insertCSVFromPath(this._conn, path, options);
    }
    /** Insert json file from path */
    public insertJSONFromPath(path: string, options: JSONInsertOptions): void {
        this._bindings.insertJSONFromPath(this._conn, path, options);
    }
}
