import * as arrow from 'apache-arrow';
import * as duckdb from '@duckdb/duckdb-wasm/src/';
import * as SQL from 'sql.js';
import alasql from 'alasql';
import * as aq from 'arquero';
import { nSQL } from '@nano-sql/core';
import * as lf from 'lovefield-ts/dist/es6/lf.js';

const textDecoder = new TextDecoder();

export interface DBWrapper {
    name: string;

    implements(func: string): boolean;
    init(): Promise<void>;
    close(): Promise<void>;
    create(table: string, columns: { [key: string]: string }): Promise<void>;
    load(table: string, data: arrow.Table): Promise<void>;
    scanInt(table: string): Promise<void>;
    sum(table: string, column: string): Promise<number>;
}

function noop() {}

function sqlCreate(table: string, columns: { [key: string]: string }): string {
    let sql = `CREATE TABLE IF NOT EXISTS ${table} (`;
    for (const col of Object.getOwnPropertyNames(columns)) {
        sql += col + ' ' + columns[col] + ',';
    }
    return sql.substr(0, sql.length - 1) + ')';
}

function sqlInsert(table: string, data: arrow.Table): string {
    let result = '';
    for (let i = 0; i < data.length; i += 1000) {
        let query = `INSERT INTO ${table} VALUES `;
        const maxVal = Math.min(i + 1000, data.length);
        for (let j = i; j < maxVal; j++) {
            const row = data.get(j);
            query += '(';
            for (let k = 0; k < data.numCols; k++) {
                query += JSON.stringify(row[0]);
                if (k < data.numCols - 1) query += ',';
            }
            query += ')';
            if (j < maxVal - 1) query += ',';
        }
        result += query + ';';
    }

    return result;
}

export class DuckDBSyncMatWrapper implements DBWrapper {
    public name: string;
    protected conn?: duckdb.DuckDBConnection;
    protected db: duckdb.DuckDBBindings;

    constructor(db: duckdb.DuckDBBindings) {
        this.name = 'DuckDB';
        this.db = db;
    }

    init(): Promise<void> {
        this.conn = this.db.connect();
        return Promise.resolve();
    }

    close(): Promise<void> {
        this.conn!.disconnect();
        return Promise.resolve();
    }

    create(table: string, columns: { [key: string]: string }): Promise<void> {
        this.conn!.runQuery(`DROP TABLE IF EXISTS ${table}`);
        this.conn!.runQuery(sqlCreate(table, columns));
        return Promise.resolve();
    }

    load(table: string, data: arrow.Table): Promise<void> {
        this.conn!.runQuery(sqlInsert(table, data));
        return Promise.resolve();
    }

    scanInt(table: string): Promise<void> {
        const results = this.conn!.runQuery<{ a_value: arrow.Int32 }>(`SELECT a_value FROM ${table}`);
        for (const v of results.getColumnAt(0)!) {
            noop();
        }
        return Promise.resolve();
    }

    sum(table: string, column: string): Promise<number> {
        const result = this.conn!.runQuery<{ sum_v: arrow.Int32 }>(
            `SELECT sum(${column})::INTEGER as sum_v FROM ${table}`,
        );
        return Promise.resolve(result.getColumnAt(0)!.get(0));
    }

    implements(func: string): boolean {
        return true;
    }
}

export class DuckDBSyncStreamWrapper extends DuckDBSyncMatWrapper {
    constructor(db: duckdb.DuckDBBindings) {
        super(db);
        this.name = 'DuckDB-stream';
    }

    scanInt(table: string): Promise<void> {
        const results = this.conn!.sendQuery<{ a_value: arrow.Int32 }>(`SELECT a_value FROM ${table}`);
        for (const batch of results) {
            for (const v of batch.getChildAt(0)!) {
                noop();
            }
        }

        return Promise.resolve();
    }
}

export class DuckDBAsyncStreamWrapper implements DBWrapper {
    public name: string;
    protected conn?: duckdb.AsyncDuckDBConnection;
    protected db: duckdb.AsyncDuckDB;

    constructor(db: duckdb.AsyncDuckDB) {
        this.db = db;
        this.name = 'DuckDB-async';
    }

    async init(): Promise<void> {
        this.conn = await this.db.connect();
    }

    async close(): Promise<void> {
        await this.conn?.disconnect();
    }

    async create(table: string, columns: { [key: string]: string }): Promise<void> {
        await this.conn!.runQuery(`DROP TABLE IF EXISTS ${table}`);
        await this.conn!.runQuery(sqlCreate(table, columns));
    }

    async load(table: string, data: arrow.Table): Promise<void> {
        await this.conn!.runQuery(sqlInsert(table, data));
    }

    async scanInt(table: string): Promise<void> {
        const results = await this.conn!.sendQuery<{ a_value: arrow.Int32 }>(`SELECT a_value FROM ${table}`);
        for await (const batch of results) {
            for (const v of batch.getChildAt(0)!) {
                noop();
            }
        }
    }

    async sum(table: string, column: string): Promise<number> {
        const result = await this.conn!.runQuery<{ sum_v: arrow.Int32 }>(
            `SELECT sum(${column})::INTEGER as sum_v FROM ${table}`,
        );
        return result.getColumnAt(0)!.get(0);
    }

    implements(func: string): boolean {
        return true;
    }
}

export class SQLjsWrapper implements DBWrapper {
    name: string;
    db: SQL.Database;

    constructor(db: SQL.Database) {
        this.name = 'sql.js';
        this.db = db;
    }

    init(): Promise<void> {
        return Promise.resolve();
    }

    close(): Promise<void> {
        return Promise.resolve();
    }

    create(table: string, columns: { [key: string]: string }): Promise<void> {
        this.db.run(`DROP TABLE IF EXISTS ${table}`);
        this.db.run(sqlCreate(table, columns));
        return Promise.resolve();
    }

    load(table: string, data: arrow.Table): Promise<void> {
        this.db.run(sqlInsert(table, data));
        return Promise.resolve();
    }

    scanInt(table: string): Promise<void> {
        const results = this.db.exec(`SELECT a_value FROM ${table}`);
        for (const row of results[0].values) {
            noop();
        }
        return Promise.resolve();
    }

    sum(table: string, column: string): Promise<number> {
        const results = this.db.exec(`SELECT sum(${column}) as a_value FROM ${table}`);
        return Promise.resolve(<number>results[0].values[0][0]);
    }

    implements(func: string): boolean {
        return true;
    }
}

export class AlaSQLWrapper implements DBWrapper {
    name: string;

    constructor() {
        this.name = 'AlaSQL';
    }

    init(): Promise<void> {
        return Promise.resolve();
    }

    close(): Promise<void> {
        return Promise.resolve();
    }

    create(table: string, columns: { [key: string]: string }): Promise<void> {
        alasql(`DROP TABLE IF EXISTS ${table}`);
        alasql(sqlCreate(table, columns));
        return Promise.resolve();
    }

    load(table: string, data: arrow.Table): Promise<void> {
        alasql(sqlInsert(table, data));
        return Promise.resolve();
    }

    scanInt(table: string): Promise<void> {
        const rows = alasql(`SELECT a_value FROM ${table}`);
        for (const row of rows) {
            noop();
        }
        return Promise.resolve();
    }

    sum(table: string, column: string): Promise<number> {
        const rows = alasql(`SELECT sum(${column}) as a_value FROM ${table}`);
        return rows[0][column];
    }

    implements(func: string): boolean {
        return true;
    }
}

export class LovefieldWrapper implements DBWrapper {
    name: string;
    builder?: lf.Builder;
    db?: lf.DatabaseConnection;

    constructor() {
        this.name = 'Lovefield';
    }

    init(): Promise<void> {
        this.builder = lf.schema.create('test_schema', 1);
        return Promise.resolve();
    }

    close(): Promise<void> {
        if (this.db) {
            this.db!.close();
            this.db = undefined;
        }
        return Promise.resolve();
    }

    create(table: string, columns: { [key: string]: string }): Promise<void> {
        if (this.db) {
            throw 'Schema is fixed after first insert.';
        }

        let tableBuilder = this.builder!.createTable(table);
        let type: lf.Type;
        for (const col of Object.getOwnPropertyNames(columns)) {
            switch (columns[col]) {
                case 'INTEGER': {
                    type = lf.Type.INTEGER;
                    break;
                }
                default:
                    throw 'Unknown column type ' + columns[col];
            }

            tableBuilder = tableBuilder.addColumn(col, type);
        }
        return Promise.resolve();
    }

    async load(table: string, data: arrow.Table): Promise<void> {
        if (!this.db) {
            this.db = await this.builder!.connect({ storeType: lf.DataStoreType.MEMORY });
        }
        let rows = [];
        const t = this.db!.getSchema().table(table);
        for (const row of data) {
            rows.push(t.createRow(row));
        }

        await this.db!.insert().into(t).values(rows).exec();
    }

    async scanInt(table: string): Promise<void> {
        const rows = <{ a_value: Promise<number> }[]>(
            await this.db!.select().from(this.db!.getSchema().table(table)).exec()
        );
        for (const row of rows) {
            noop();
        }
    }

    async sum(table: string, column: string): Promise<number> {
        const tbl = this.db!.getSchema().table(table);
        const rows = <{ a_value: number }[]>await this.db!.select(lf.fn.sum(tbl.col(column)).as(column))
            .from(tbl)
            .exec();
        return rows[0].a_value;
    }

    implements(func: string): boolean {
        return true;
    }
}

export class ArqueroWrapper implements DBWrapper {
    name: string;
    schemas: { [key: string]: { [key: string]: string } } = {};
    tables: { [key: string]: aq.internal.Table } = {};

    constructor() {
        this.name = 'Arquero';
    }

    init(): Promise<void> {
        return Promise.resolve();
    }

    close(): Promise<void> {
        this.tables = {};
        this.schemas = {};
        return Promise.resolve();
    }

    create(table: string, columns: { [key: string]: string }): Promise<void> {
        this.schemas[table] = columns;
        return Promise.resolve();
    }

    load(table: string, data: arrow.Table): Promise<void> {
        this.tables[table] = aq.fromArrow(data);
        return Promise.resolve();
    }

    scanInt(table: string): Promise<void> {
        for (const row of this.tables[table].objects()) {
            noop();
        }
        return Promise.resolve();
    }

    sum(table: string, column: string): Promise<number> {
        const rows = this.tables[table].rollup({ sum_v: `aq.op.sum(d['${column}'])` }).objects();
        return Promise.resolve(rows[0].sum_v);
    }

    implements(func: string): boolean {
        return true;
    }
}

export class NanoSQLWrapper implements DBWrapper {
    name: string;

    constructor() {
        this.name = 'nanoSQL';
    }

    async init(): Promise<void> {
        await nSQL().createDatabase({
            id: 'test_schema',
            mode: 'TEMP',
        });
        nSQL().useDatabase('test_schema');
    }

    async close(): Promise<void> {
        await nSQL().disconnect();
    }

    async create(table: string, columns: { [key: string]: string }): Promise<void> {
        let model: any = {};
        for (const k of Object.getOwnPropertyNames(columns)) {
            switch (columns[k]) {
                case 'INTEGER': {
                    model[`${k}:int`] = {};
                    break;
                }
                default:
                    throw 'Unhandled type ' + columns[k];
            }
        }
        await nSQL().query('create table', { name: table, model: model }).exec();
    }

    async load(table: string, data: arrow.Table): Promise<void> {
        const rows = [];
        for (const row of data) rows.push(row);
        await nSQL(table).loadJS(rows);
    }

    async scanInt(table: string): Promise<void> {
        for (const row of await nSQL(table).query('select', ['a_value']).exec()) {
            noop();
        }
    }

    async sum(table: string, column: string): Promise<number> {
        const rows = await nSQL(table)
            .query('select', [`SUM(${column}) as sum_v`])
            .exec();
        return rows[0].sum_v;
    }

    implements(func: string): boolean {
        return true;
    }
}
