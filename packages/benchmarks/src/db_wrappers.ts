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
    create(table: string, data: arrow.Table, keys: string[][]): Promise<void>;
    load(table: string, path: string | null, data: arrow.Table): Promise<void>;
    scanInt(table: string): Promise<void>;
    sum(table: string, column: string): Promise<number>;
    join(from: string[], to: string[]): Promise<number>;
}

function noop() {}

export function sqlCreate(table: string, data: arrow.Table, keys: string[][]): string {
    let sql = `CREATE TABLE IF NOT EXISTS ${table} (`;
    for (const f of data.schema.fields) {
        sql += f.name + ' ';
        switch (f.typeId) {
            case arrow.Type.Int:
                sql += 'INTEGER';
                break;
            case arrow.Type.Float:
                sql += 'FLOAT';
                break;
            case arrow.Type.Utf8:
                sql += 'TEXT';
                break;
            case arrow.Type.Date:
                sql += 'DATE';
                break;
            default:
                throw 'Type not implemented: ' + f.typeId;
        }

        sql += ',';
    }
    if (keys.length > 0) {
        // key 0 is primary key
        sql += 'PRIMARY KEY (';
        for (let i = 0; i < keys[0].length; i++) {
            sql += keys[0][i];
            if (i < keys[0].length - 1) sql += ',';
        }
        sql += ')';
    }
    return sql + ')';
}

export function* sqlInsert(table: string, data: arrow.Table) {
    for (let i = 0; i < data.length; ) {
        let query = `INSERT INTO ${table} VALUES `;
        const maxVal = Math.min(i + 1000, data.length);
        for (let j = i; j < maxVal; j++) {
            const row = data.get(j);
            query += '(';
            for (let k = 0; k < data.numCols; k++) {
                const f = data.schema.fields[k];
                switch (f.typeId) {
                    case arrow.Type.Int:
                    case arrow.Type.Float:
                        query += row[k];
                        break;
                    case arrow.Type.Utf8:
                        query += "'" + row[k] + "'";
                        break;
                    case arrow.Type.Date:
                        query += "'" + row[k].toISOString().slice(0, 19).replace('T', ' ') + "'";
                        break;
                    default:
                        throw 'Type not implemented: ' + f.typeId;
                }
                if (k < data.numCols - 1) query += ',';
            }
            query += ')';
            if (j < maxVal - 1) query += ',';
        }
        i = maxVal;
        console.log(Math.round((i / data.length) * 100) + '%');
        yield query;
    }
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

    create(table: string, data: arrow.Table, keys: string[][]): Promise<void> {
        this.conn!.runQuery(`DROP TABLE IF EXISTS ${table}`);
        this.conn!.runQuery(sqlCreate(table, data, keys));
        return Promise.resolve();
    }

    async load(table: string, path: string | null, data: arrow.Table): Promise<void> {
        for (const query of sqlInsert(table, data)) this.conn!.runQuery(query);
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
        const result = this.conn!.runQuery<{ sum_v: arrow.Float64 }>(
            `SELECT sum(${column})::DOUBLE as sum_v FROM ${table}`,
        );
        return Promise.resolve(result.getColumnAt(0)!.get(0));
    }

    join(from: string[], to: string[]): Promise<number> {
        const result = this.conn!.runQuery<{ cnt: arrow.Int32 }>(
            `SELECT count(*)::INTEGER as cnt FROM ${from[0]} a
            INNER JOIN ${to[0]} b ON (a.${from[1]} = b.${to[1]})`,
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

export abstract class DuckDBAsyncStreamWrapper implements DBWrapper {
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

    async create(table: string, data: arrow.Table, keys: string[][]): Promise<void> {
        await this.conn!.runQuery(`DROP TABLE IF EXISTS ${table}`);
        await this.conn!.runQuery(sqlCreate(table, data, keys));
    }

    async load(table: string, path: string | null, data: arrow.Table): Promise<void> {
        if (path) {
            await this.registerFile(path);
            await this.conn!.runQuery(`INSERT INTO ${table} SELECT * FROM parquet_scan('${path}')`);
        } else {
            for (const query of sqlInsert(table, data)) await this.conn!.runQuery(query);
        }
    }

    abstract registerFile(path: string): Promise<void>;

    async scanInt(table: string): Promise<void> {
        const results = await this.conn!.sendQuery<{ a_value: arrow.Int32 }>(`SELECT a_value FROM ${table}`);
        for await (const batch of results) {
            for (const v of batch.getChildAt(0)!) {
                noop();
            }
        }
    }

    async sum(table: string, column: string): Promise<number> {
        const result = await this.conn!.runQuery<{ sum_v: arrow.Float64 }>(
            `SELECT sum(${column})::DOUBLE as sum_v FROM ${table}`,
        );
        return result.getColumnAt(0)!.get(0);
    }

    async join(from: string[], to: string[]): Promise<number> {
        const result = await this.conn!.runQuery<{ cnt: arrow.Int32 }>(
            `SELECT count(*)::INTEGER FROM ${from[0]} a
            INNER JOIN ${to[0]} b ON (a.${from[1]} = b.${to[1]})`,
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

    create(table: string, data: arrow.Table, keys: string[][]): Promise<void> {
        this.db.run(`DROP TABLE IF EXISTS ${table}`);
        this.db.run(sqlCreate(table, data, keys));
        return Promise.resolve();
    }

    load(table: string, path: string | null, data: arrow.Table): Promise<void> {
        for (const query of sqlInsert(table, data)) this.db.run(query);
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

    join(from: string[], to: string[]): Promise<number> {
        const results = this.db.exec(
            `SELECT count(*) FROM ${from[0]} a
            INNER JOIN ${to[0]} b ON (a.${from[1]} == b.${to[1]})`,
        );

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

    create(table: string, data: arrow.Table, keys: string[][]): Promise<void> {
        alasql(`DROP TABLE IF EXISTS ${table}`);
        alasql(sqlCreate(table, data, keys));
        return Promise.resolve();
    }

    load(table: string, path: string | null, data: arrow.Table): Promise<void> {
        for (const q of sqlInsert(table, data)) alasql(q);
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

    join(from: string[], to: string[]): Promise<number> {
        const rows = alasql(`SELECT count(*) as cnt FROM ${from[0]} a
        INNER JOIN ${to[0]} b ON (a.${from[1]} = b.${to[1]})`);
        return rows[0]['cnt'];
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

    create(table: string, data: arrow.Table, keys: string[][]): Promise<void> {
        if (this.db) {
            throw 'Schema is fixed after first insert.';
        }

        let tableBuilder = this.builder!.createTable(table);
        let type: lf.Type;
        for (const col of data.schema.fields) {
            switch (col.typeId) {
                case arrow.Type.Int:
                    type = lf.Type.INTEGER;
                    break;
                case arrow.Type.Float:
                    type = lf.Type.NUMBER;
                    break;
                case arrow.Type.Utf8:
                    type = lf.Type.STRING;
                    break;
                case arrow.Type.Date:
                    type = lf.Type.DATE_TIME;
                    break;
                default:
                    throw 'Type not implemented: ' + col.typeId;
            }

            tableBuilder = tableBuilder.addColumn(col.name, type);
        }

        if (keys.length > 0) {
            tableBuilder = tableBuilder.addPrimaryKey(keys[0], false);
        }

        return Promise.resolve();
    }

    async load(table: string, path: string | null, data: arrow.Table): Promise<void> {
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

    async join(from: string[], to: string[]): Promise<number> {
        const a = this.db!.getSchema().table(from[0]);
        const b = this.db!.getSchema().table(to[0]);
        const rows = <{ cnt: number }[]>await this.db!.select(lf.fn.count().as('cnt'))
            .from(a)
            .innerJoin(b, a.col(from[1]).eq(b.col(to[1])))
            .exec();
        return rows[0].cnt;
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

    create(table: string, data: arrow.Table, keys: string[][]): Promise<void> {
        return Promise.resolve();
    }

    load(table: string, path: string | null, data: arrow.Table): Promise<void> {
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

    join(from: string[], to: string[]): Promise<number> {
        const rows = this.tables[from[0]].join(this.tables[to[0]], [from[1], to[1]]).count().objects();
        return Promise.resolve(rows[0].count);
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

    async create(table: string, data: arrow.Table, keys: string[][]): Promise<void> {
        if (keys.length > 0 && keys[0].length > 1) {
            console.warn('Nano SQL does not support composite primary keys');
            keys = [];
        }

        let model: any = {};
        for (const col of data.schema.fields) {
            let mod: any = {};
            if (keys.length > 0) {
                if (keys[0][0] == col.name) mod['pk'] = true;
            }

            switch (col.typeId) {
                case arrow.Type.Int:
                    model[`${col.name}:int`] = mod;
                    break;
                case arrow.Type.Float:
                    model[`${col.name}:float`] = mod;
                    break;
                case arrow.Type.Utf8:
                    model[`${col.name}:string`] = mod;
                    break;
                case arrow.Type.Date:
                    model[`${col.name}:date`] = mod;
                    break;
                default:
                    throw 'Type not implemented: ' + col.typeId;
            }
        }

        await nSQL().query('create table', { name: table, model: model }).exec();
    }

    async load(table: string, path: string | null, data: arrow.Table): Promise<void> {
        const rows = [];
        for (const row of data) rows.push(row);
        let last = 0;
        await nSQL(table).loadJS(rows, progress => {
            let val = Math.round(progress);
            if (last != val) {
                console.log(val + '%');
                last = val;
            }
        });
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

    async join(from: string[], to: string[]): Promise<number> {
        const rows = await nSQL(from[0])
            .query('select', ['COUNT(*) as cnt'])
            .join({
                type: 'inner',
                with: { table: to[0] },
                on: [from.join('.'), '=', to.join('.')],
            })
            .exec();
        return rows[0].cnt;
    }

    implements(func: string): boolean {
        if (func == 'join') return false; // Holy shit nanoSQL is fucking slow. 118s for a 0.005 SF simple join.
        return true;
    }
}
