import * as arrow from 'apache-arrow';
import * as duckdb from '@duckdb/duckdb-wasm/src/';
import * as SQL from 'sql.js';
import alasql from 'alasql';
import * as aq from 'arquero';
import { nSQL } from '@nano-sql/core';
import * as lf from 'lovefield-ts/dist/es6/lf.js';

function noop() {}

const tpchTables = ['customer', 'lineitem', 'nation', 'orders', 'partsupp', 'part', 'region', 'supplier'];

const tpchQueries: string[] = [];
const tpchSqliteQueries: string[] = [];

export interface DBWrapper {
    name: string;

    implements(func: string): boolean;
    init(): Promise<void>;
    close(): Promise<void>;
    create(table: string, data: arrow.Table, keys: string[][]): Promise<void>;
    load(table: string, path: string | null, data: arrow.Table): Promise<void>;

    // Perform a no-op scan matching this:
    //// SELECT a FROM scan_table
    scanInt(): Promise<void>;
    // Perform a sum matching this:
    //// SELECT sum(a) as sum_v FROM scan_table
    sum(): Promise<number>;
    // Perform a simple join matching this:
    //// SELECT count(*) as cnt FROM orders
    //// INNER JOIN lineitem ON (orders.o_orderkey = lineitem.l_orderkey)
    join(): Promise<number>;
    // Perform the specified TPCH OLAP query (1-22) and materialize all rows
    tpch(query: number): Promise<void>;
}

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
        sql += '),';
    }
    return sql.substr(0, sql.length - 1) + ')';
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
        // console.info(Math.round((i / data.length) * 100) + '%');
        yield query;
    }
}

export async function loadTPCHSQL(dataFetcher: (filename: string) => Promise<string>) {
    for (let i = 1; i <= 22; i++) {
        tpchQueries[i] = await dataFetcher(`tpch_${i.toString().padStart(2, '0')}.sql`);
        if ([7, 8, 9, 22].includes(i)) {
            tpchSqliteQueries[i] = await dataFetcher(`tpch_${i.toString().padStart(2, '0')}-sqlite.sql`);
        } else {
            tpchSqliteQueries[i] = tpchQueries[i];
        }
    }
}

export abstract class DuckDBSyncMatWrapper implements DBWrapper {
    public name: string;
    protected conn?: duckdb.DuckDBConnection;
    protected db: duckdb.DuckDBBindings;
    private tpchRuns: Set<number>;

    constructor(db: duckdb.DuckDBBindings) {
        this.db = db;
        this.name = 'DuckDB';
        this.tpchRuns = new Set<number>();
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
        if (path) {
            await this.registerFile(path);
            await this.conn!.runQuery(`INSERT INTO ${table} SELECT * FROM parquet_scan('${path}')`);
        } else {
            for (const query of sqlInsert(table, data)) this.conn!.runQuery(query);
        }
        return Promise.resolve();
    }

    abstract registerFile(path: string): Promise<void>;

    scanInt(): Promise<void> {
        const results = this.conn!.runQuery<{ a: arrow.Int32 }>(`SELECT a FROM scan_table`);
        for (const v of results.getColumnAt(0)!) {
            noop();
        }
        return Promise.resolve();
    }

    sum(): Promise<number> {
        const result = this.conn!.runQuery<{ sum_v: arrow.Float64 }>(`SELECT sum(a)::DOUBLE as sum_v FROM scan_table`);
        return Promise.resolve(result.getColumnAt(0)!.get(0));
    }

    join(): Promise<number> {
        const result = this.conn!.runQuery<{ cnt: arrow.Int32 }>(
            `SELECT count(*)::INTEGER as cnt FROM orders
            INNER JOIN lineitem ON (o_orderkey = l_orderkey)`,
        );

        return Promise.resolve(result.getColumnAt(0)!.get(0));
    }

    tpch(query: number): Promise<void> {
        const result = this.conn!.runQuery(tpchQueries[query]);
        if (!this.tpchRuns.has(query)) {
            console.info(`${this.name}: TPCH-${query}`);
            const rows: any[][] = [];
            for (const row of result) {
                const vals: any = {};
                for (const k of result.schema.fields) {
                    vals[k.name] = !!row[k.name] && row[k.name].valueOf ? row[k.name].valueOf() : row[k.name];
                }
                rows.push(vals);

                // Ellipsis
                if (rows.length == 10 && result.length > 10) {
                    const v = { ...vals };
                    for (const k in v) {
                        v[k] = '...';
                    }
                    rows.push(v);
                    break;
                }
            }
            console.table(rows);
            this.tpchRuns.add(query);
        }
        return Promise.resolve();
    }

    implements(func: string): boolean {
        return true;
    }
}

export abstract class DuckDBSyncStreamWrapper extends DuckDBSyncMatWrapper {
    constructor(db: duckdb.DuckDBBindings) {
        super(db);
        this.name = 'DuckDB-stream';
    }

    scanInt(): Promise<void> {
        const results = this.conn!.sendQuery<{ a: arrow.Int32 }>('SELECT a FROM scan_table');
        for (const batch of results) {
            for (const v of batch.getChildAt(0)!) {
                noop();
            }
        }

        return Promise.resolve();
    }

    implements(func: string): boolean {
        // Don't run these, no difference to materialized
        if (func == 'join') return false;
        if (func == 'tpch') return false;
        return true;
    }
}

export abstract class DuckDBAsyncStreamWrapper implements DBWrapper {
    public name: string;
    protected conn?: duckdb.AsyncDuckDBConnection;
    protected db: duckdb.AsyncDuckDB;
    private tpchRuns: Set<number>;

    constructor(db: duckdb.AsyncDuckDB) {
        this.db = db;
        this.name = 'DuckDB-async';
        this.tpchRuns = new Set<number>();
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

    async scanInt(): Promise<void> {
        const results = await this.conn!.sendQuery<{ a: arrow.Int32 }>('SELECT a FROM scan_table');
        for await (const batch of results) {
            for (const v of batch.getChildAt(0)!) {
                noop();
            }
        }
    }

    async sum(): Promise<number> {
        const result = await this.conn!.runQuery<{ sum_v: arrow.Float64 }>(
            'SELECT sum(a)::DOUBLE as sum_v FROM scan_table',
        );
        return result.getColumnAt(0)!.get(0);
    }

    async join(): Promise<number> {
        const result = await this.conn!.runQuery<{ cnt: arrow.Int32 }>(
            `SELECT count(*)::INTEGER FROM orders
            INNER JOIN lineitem ON (o_orderkey = l_orderkey)`,
        );

        return result.getColumnAt(0)!.get(0);
    }

    async tpch(query: number): Promise<void> {
        const result = await this.conn!.runQuery(tpchQueries[query]);
        if (!this.tpchRuns.has(query)) {
            console.info(`${this.name}: TPCH-${query}`);
            const rows: any[][] = [];
            for (const row of result) {
                const vals: any = {};
                for (const k of result.schema.fields) {
                    vals[k.name] = !!row[k.name] && row[k.name].valueOf ? row[k.name].valueOf() : row[k.name];
                }
                rows.push(vals);

                // Ellipsis
                if (rows.length == 10 && result.length > 10) {
                    const v = { ...vals };
                    for (const k in v) {
                        v[k] = '...';
                    }
                    rows.push(v);
                    break;
                }
            }
            console.table(rows);
            this.tpchRuns.add(query);
        }
    }

    implements(func: string): boolean {
        return true;
    }
}

export class SQLjsWrapper implements DBWrapper {
    name: string;
    db: SQL.Database;
    private tpchRuns: Set<number>;

    constructor(db: SQL.Database) {
        this.name = 'sql.js';
        this.db = db;
        this.tpchRuns = new Set<number>();
    }

    init(): Promise<void> {
        return Promise.resolve();
    }

    close(): Promise<void> {
        return Promise.resolve();
    }

    create(table: string, data: arrow.Table, keys: string[][]): Promise<void> {
        // TPCH is preloaded
        if (tpchTables.includes(table)) return Promise.resolve();

        this.db.run(`DROP TABLE IF EXISTS ${table}`);
        this.db.run(sqlCreate(table, data, keys));
        return Promise.resolve();
    }

    load(table: string, path: string | null, data: arrow.Table): Promise<void> {
        // TPCH is preloaded
        if (tpchTables.includes(table)) return Promise.resolve();

        for (const query of sqlInsert(table, data)) this.db.run(query);
        return Promise.resolve();
    }

    scanInt(): Promise<void> {
        const results = this.db.exec('SELECT a FROM scan_table');
        for (const row of results[0].values) {
            noop();
        }
        return Promise.resolve();
    }

    sum(): Promise<number> {
        const results = this.db.exec('SELECT sum(a) as sum_v FROM scan_table');
        return Promise.resolve(<number>results[0].values[0][0]);
    }

    join(): Promise<number> {
        const results = this.db.exec(
            `SELECT count(*) FROM orders
            INNER JOIN lineitem ON (o_orderkey = l_orderkey)`,
        );

        return Promise.resolve(<number>results[0].values[0][0]);
    }

    async tpch(query: number): Promise<void> {
        const result = await this.db.exec(tpchSqliteQueries[query])[0];
        if (!this.tpchRuns.has(query)) {
            console.info(`${this.name}: TPCH-${query}`);
            const rows: any[] = [];
            for (const row of result.values) {
                const vals: any = {};
                for (let i = 0; i < row.length; i++) {
                    vals[result.columns[i]] = row[i];
                }
                rows.push(vals);

                // Ellipsis
                if (rows.length == 10 && result.values.length > 10) {
                    const v = { ...vals };
                    for (const k in v) {
                        v[k] = '...';
                    }
                    rows.push(v);
                    break;
                }
            }
            console.table(rows);
            this.tpchRuns.add(query);
        }

        return Promise.resolve();
    }

    implements(func: string): boolean {
        return true;
    }
}

export class AlaSQLWrapper implements DBWrapper {
    name: string;
    private tpchRuns: Set<number>;

    constructor() {
        this.name = 'AlaSQL';
        this.tpchRuns = new Set<number>();
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

    scanInt(): Promise<void> {
        const rows = alasql('SELECT a FROM scan_table');
        for (const row of rows) {
            noop();
        }
        return Promise.resolve();
    }

    sum(): Promise<number> {
        const rows = alasql(`SELECT sum(a) as sum_v FROM scan_table`);
        return rows[0]['sum_v'];
    }

    join(): Promise<number> {
        const rows = alasql(
            `SELECT count(*) as cnt FROM orders
            INNER JOIN lineitem ON (o_orderkey = l_orderkey)`,
        );
        return rows[0]['cnt'];
    }

    tpch(query: number): Promise<void> {
        const rows: any[] = alasql(tpchQueries[query]);
        if (!this.tpchRuns.has(query)) {
            console.table(rows.slice(0, Math.min(rows.length, 10)));
            this.tpchRuns.add(query);
        }
        return Promise.resolve();
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

    async scanInt(): Promise<void> {
        const rows = <{ a: Promise<number> }[]>(
            await this.db!.select().from(this.db!.getSchema().table('scan_table')).exec()
        );
        for (const row of rows) {
            noop();
        }
    }

    async sum(): Promise<number> {
        const tbl = this.db!.getSchema().table('scan_table');
        const rows = <{ sum_v: number }[]>await this.db!.select(lf.fn.sum(tbl.col('a')).as('sum_v'))
            .from(tbl)
            .exec();
        return rows[0].sum_v;
    }

    async join(): Promise<number> {
        const schema = this.db!.getSchema();
        const a = schema.table('orders');
        const b = schema.table('lineitem');
        let builder = this.db!.select(lf.fn.count().as('cnt'))
            .from(a)
            .innerJoin(b, a.col('o_orderkey').eq(b.col('l_orderkey')));

        const rows = <{ cnt: number }[]>await builder.exec();
        return rows[0].cnt;
    }

    async tpch(query: number): Promise<void> {}

    implements(func: string): boolean {
        if (func == 'tpch') return false;
        return true;
    }
}

export class ArqueroWrapper implements DBWrapper {
    name: string;
    schemas: { [key: string]: { [key: string]: string } } = {};
    tables: { [key: string]: aq.internal.Table } = {};
    private tpchRuns: Set<number>;

    constructor() {
        this.name = 'Arquero';
        this.tpchRuns = new Set<number>();
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

    scanInt(): Promise<void> {
        for (const row of this.tables['scan_table'].objects()) {
            noop();
        }
        return Promise.resolve();
    }

    sum(): Promise<number> {
        const rows = this.tables['scan_table'].rollup({ sum_v: `aq.op.sum(d['a'])` }).objects();
        return Promise.resolve(rows[0].sum_v);
    }

    join(): Promise<number> {
        return Promise.resolve(
            this.tables['orders'].join(this.tables['lineitem'], ['o_orderkey', 'l_orderkey']).count().objects()[0]
                .count,
        );
    }

    async tpch(query: number): Promise<void> {
        if (query == 1) {
            const result = this.tables['lineitem']
                .filter((d: any) => d.l_shipdate <= aq.op.timestamp('1998-09-02'))
                .groupby('l_returnflag', 'l_linestatus')
                .derive({
                    disc_price: (d: any) => d.l_extendedprice * (1 - d.l_discount),
                    charge: (d: any) => d.l_extendedprice * (1 - d.l_discount) * (1 + d.l_tax),
                })
                .rollup({
                    sum_qty: (d: any) => aq.op.sum(d.l_quantity),
                    sum_base_price: (d: any) => aq.op.sum(d.l_extendedprice),
                    sum_disc_price: (d: any) => aq.op.sum(d.disc_price),
                    sum_charge: (d: any) => aq.op.sum(d.charge),
                    avg_qty: (d: any) => aq.op.average(d.l_quantity),
                    avg_price: (d: any) => aq.op.average(d.l_extendedprice),
                    avg_disc: (d: any) => aq.op.average(d.l_discount),
                    count_order: (d: any) => aq.op.count(),
                })
                .orderby('l_returnflag', 'l_linestatus')
                .objects();

            if (!this.tpchRuns.has(query)) {
                console.info(`${this.name}: TPCH-${query}`);
                console.table(result);
                this.tpchRuns.add(query);
            }
        } else if (query == 17) {
            const a = this.tables['lineitem'];
            const b = this.tables['part'];

            const subquery = a.groupby('l_partkey').rollup({
                l_avg: (d: any) => 0.2 * aq.op.average(d.l_quantity),
            });

            const result = a
                .join(b, ['l_partkey', 'p_partkey'])
                .join(subquery, ['l_partkey', 'l_partkey'])
                .filter((d: any) => d.p_brand == 'Brand#23' && d.p_container == 'MED BOX' && d.l_quantity < d.l_avg)
                .rollup({
                    avg_yearly: (d: any) => aq.op.sum(d.l_extendedprice) / 7.0,
                })
                .objects();

            if (!this.tpchRuns.has(query)) {
                console.info(`${this.name}: TPCH-${query}`);
                console.table(result);
                this.tpchRuns.add(query);
            }
        }
    }

    implements(func: string): boolean {
        if (func == 'tpch') return true;
        if (func.startsWith('tpch')) return ['tpch-1', 'tpch-17'].includes(func);
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
                console.info(val + '%');
                last = val;
            }
        });
    }

    async scanInt(): Promise<void> {
        for (const row of await nSQL('scan_table').query('select', ['a']).exec()) {
            noop();
        }
    }

    async sum(): Promise<number> {
        const rows = await nSQL('scan_table').query('select', ['SUM(a) as sum_v']).exec();
        return rows[0].sum_v;
    }

    async join(): Promise<number> {
        let builder = nSQL('orders')
            .query('select', ['COUNT(*) as cnt'])
            .join({
                type: 'inner',
                with: { table: 'lineitem' },
                on: ['orders.o_orderkey', '=', 'lineitem.l_orderkey'],
            });
        return (await builder.exec())[0].cnt;
    }

    async tpch(query: number): Promise<void> {
        // not even implementing it after seeing how slow join was
    }

    implements(func: string): boolean {
        if (func == 'join') return false; // Holy shit nanoSQL is fucking slow. 118s for a 0.005 SF simple join.
        if (func == 'tpch') return false;
        return true;
    }
}
