import * as arrow from 'apache-arrow';
import * as duckdb from '@duckdb/duckdb-wasm/src/';
import * as SQL from 'sql.js';
import alasql from 'alasql';
import * as aq from 'arquero';
import { nSQL } from '@nano-sql/core';
import * as lf from 'lovefield-ts/dist/es6/lf.js';

const textDecoder = new TextDecoder();

const tpchTables = ['customer', 'lineitem', 'nation', 'orders', 'partsupp', 'part', 'region', 'supplier'];

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
    // Perform a TPCH-2 OLAP query and materialize all rows:
    //// select s_acctbal, s_name, n_name, p_partkey, p_mfgr, s_address, s_phone, s_comment
    //// from part, supplier, partsupp, nation, region
    //// where
    ////     p_partkey = ps_partkey
    ////     and s_suppkey = ps_suppkey
    ////     and p_size = 15
    ////     and p_type like '%BRASS'
    ////     and s_nationkey = n_nationkey
    ////     and n_regionkey = r_regionkey
    ////     and r_name = 'EUROPE'
    ////     and ps_supplycost = (
    ////         select min(ps_supplycost)
    ////         from partsupp, supplier, nation, region
    ////         where
    ////             p_partkey = ps_partkey
    ////             and s_suppkey = ps_suppkey
    ////             and s_nationkey = n_nationkey
    ////             and n_regionkey = r_regionkey
    ////             and r_name = 'EUROPE'
    ////     )
    //// order by s_acctbal desc, n_name, s_name, p_partkey
    //// limit 100;
    tpch(): Promise<void>;
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
        console.log(Math.round((i / data.length) * 100) + '%');
        yield query;
    }
}

export abstract class DuckDBSyncMatWrapper implements DBWrapper {
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

    tpch(): Promise<void> {
        this.conn!.runQuery(
            `select
                l_returnflag,
                l_linestatus,
                sum(l_quantity) as sum_qty,
                sum(l_extendedprice) as sum_base_price,
                sum(l_extendedprice * (1 - l_discount)) as sum_disc_price,
                sum(l_extendedprice * (1 - l_discount) * (1 + l_tax)) as sum_charge,
                avg(l_quantity) as avg_qty,
                avg(l_extendedprice) as avg_price,
                avg(l_discount) as avg_disc,
                count(*) as count_order
            from
                lineitem
            where
                l_shipdate <= cast('1998-09-02' as date)
            group by
                l_returnflag,
                l_linestatus
            order by
                l_returnflag,
                l_linestatus;`,
        );

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

    async tpch(): Promise<void> {
        await this.conn!.runQuery(
            `select
                l_returnflag,
                l_linestatus,
                sum(l_quantity) as sum_qty,
                sum(l_extendedprice) as sum_base_price,
                sum(l_extendedprice * (1 - l_discount)) as sum_disc_price,
                sum(l_extendedprice * (1 - l_discount) * (1 + l_tax)) as sum_charge,
                avg(l_quantity) as avg_qty,
                avg(l_extendedprice) as avg_price,
                avg(l_discount) as avg_disc,
                count(*) as count_order
            from
                lineitem
            where
                l_shipdate <= cast('1998-09-02' as date)
            group by
                l_returnflag,
                l_linestatus
            order by
                l_returnflag,
                l_linestatus;`,
        );
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

    tpch(): Promise<void> {
        this.db.exec(
            `select
                l_returnflag,
                l_linestatus,
                sum(l_quantity) as sum_qty,
                sum(l_extendedprice) as sum_base_price,
                sum(l_extendedprice * (1 - l_discount)) as sum_disc_price,
                sum(l_extendedprice * (1 - l_discount) * (1 + l_tax)) as sum_charge,
                avg(l_quantity) as avg_qty,
                avg(l_extendedprice) as avg_price,
                avg(l_discount) as avg_disc,
                count(*) as count_order
            from
                lineitem
            where
                l_shipdate <= cast('1998-09-02' as date)
            group by
                l_returnflag,
                l_linestatus
            order by
                l_returnflag,
                l_linestatus;`,
        );

        return Promise.resolve();
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

    tpch(): Promise<void> {
        alasql(
            `select
                l_returnflag,
                l_linestatus,
                sum(l_quantity) as sum_qty,
                sum(l_extendedprice) as sum_base_price,
                sum(l_extendedprice * (1 - l_discount)) as sum_disc_price,
                sum(l_extendedprice * (1 - l_discount) * (1 + l_tax)) as sum_charge,
                avg(l_quantity) as avg_qty,
                avg(l_extendedprice) as avg_price,
                avg(l_discount) as avg_disc,
                count(*) as count_order
            from
                lineitem
            where
                l_shipdate <= cast('1998-09-02' as date)
            group by
                l_returnflag,
                l_linestatus
            order by
                l_returnflag,
                l_linestatus;`,
        );

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

    async tpch(): Promise<void> {
        /*const schema = this.db!.getSchema();
        const l = schema.table('lineitem');
        let builder = this.db!.select(
            l.col('l_returnflag'),
            l.col('l_linestatus'),
            lf.fn.sum(l.col('l_quantity')).as('sum_qty'),
            lf.fn.sum(l.col('l_extendedprice')).as('sum_base_price'),
            lf.fn.sum(<any>(l.col('l_extendedprice') * (1 - l.col('l_discount')))).as('l_extendedprice'),
        );*/
    }

    implements(func: string): boolean {
        if (func == 'tpch') return false;
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

    async tpch(): Promise<void> {
        return Promise.resolve();
    }

    implements(func: string): boolean {
        if (func == 'tpch') return false;
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

    async tpch(): Promise<void> {
        // not even implementing it after seeing how slow join was
    }

    implements(func: string): boolean {
        if (func == 'simpleJoin') return false; // Holy shit nanoSQL is fucking slow. 118s for a 0.005 SF simple join.
        if (func == 'tpch') return false;
        return true;
    }
}
