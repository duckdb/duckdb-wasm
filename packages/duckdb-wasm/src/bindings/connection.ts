import * as arrow from 'apache-arrow';
import { CSVTableOptions, JSONTableOptions } from './table_options';

interface IDuckDBBindings {
    disconnect(conn: number): void;
    runQuery(conn: number, text: string): Uint8Array;
    sendQuery(conn: number, text: string): Uint8Array;
    fetchQueryResults(conn: number): Uint8Array;
    importCSVFromPath(conn: number, path: string, options: CSVTableOptions): void;
    importJSONFromPath(conn: number, path: string, options: JSONTableOptions): void;
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
    _bindings: IDuckDBBindings;
    /** The connection handle */
    _conn: number;

    /** Constructor */
    constructor(bindings: IDuckDBBindings, conn: number) {
        this._bindings = bindings;
        this._conn = conn;
    }

    public get handle(): number {
        return this._conn;
    }

    public disconnect(): void {
        this._bindings.disconnect(this._conn);
    }

    public runQuery<T extends { [key: string]: arrow.DataType } = any>(text: string): arrow.Table<T> {
        const buffer = this._bindings.runQuery(this._conn, text);
        const reader = arrow.RecordBatchReader.from<T>(buffer);
        console.assert(reader.isSync());
        console.assert(reader.isFile());
        return arrow.Table.from(reader as arrow.RecordBatchFileReader);
    }

    public sendQuery<T extends { [key: string]: arrow.DataType } = any>(
        text: string,
    ): arrow.RecordBatchStreamReader<T> {
        const header = this._bindings.sendQuery(this._conn, text);
        const iter = new ResultStreamIterator(this._bindings, this._conn, header);
        const reader = arrow.RecordBatchReader.from<T>(iter);
        console.assert(reader.isSync());
        console.assert(reader.isStream());
        return reader as arrow.RecordBatchStreamReader;
    }

    public importCSVFromPath(path: string, options: CSVTableOptions): void {
        this._bindings.importCSVFromPath(this._conn, path, options);
    }
    public importJSONFromPath(path: string, options: JSONTableOptions): void {
        this._bindings.importJSONFromPath(this._conn, path, options);
    }
}
