import * as duckdb from '@motherduck/duckdb-wasm/dist/duckdb-node-blocking';
import * as arrow from 'apache-arrow';
import { SystemBenchmark, SystemBenchmarkMetadata, SystemBenchmarkContext, noop } from './system_benchmark';
import {
    generateArrowInt32,
    generateArrowUtf8,
    generateArrow2Int32,
    generateArrowGroupedInt32,
    generateCSVGroupedInt32,
    generateArrowXInt32,
} from './data_generator';
import { getTPCHParquetFilePath, getTPCHQuery } from './tpch_loader';

export class DuckDBSyncLoadedTPCHBenchmark implements SystemBenchmark {
    database: duckdb.DuckDBBindings;
    connection: duckdb.DuckDBConnection | null;
    scaleFactor: number;
    query: number;
    queryText: string | null;

    constructor(database: duckdb.DuckDBBindings, scaleFactor: number, query: number) {
        this.database = database;
        this.connection = null;
        this.scaleFactor = scaleFactor;
        this.query = query;
        this.queryText = null;
    }
    getName(): string {
        return `duckdb_sync_tpch_${this.scaleFactor.toString().replace('.', '')}_q${this.query}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'tpch',
            system: 'duckdb',
            tags: ['sync'],
            timestamp: +new Date(),
            parameters: [this.scaleFactor, this.query],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        this.queryText = await getTPCHQuery(ctx.projectRootPath, `${this.query}.sql`);
        this.connection = this.database.connect();
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection!.query(this.queryText!);
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {}
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {}

    static async beforeGroup(
        database: duckdb.DuckDBBindings,
        ctx: SystemBenchmarkContext,
        scaleFactor: number,
    ): Promise<void> {
        const connection = database.connect();
        const importTPCH = (name: string) => {
            console.log(`[ RUN ]   ${name}.parquet`);
            const path = getTPCHParquetFilePath(ctx.projectRootPath, scaleFactor, `${name}.parquet`);
            database.registerFileURL(`${name}.parquet`, path, duckdb.DuckDBDataProtocol.NODE_FS, false);
            connection!.query(`CREATE TABLE ${name} AS SELECT * FROM parquet_scan('${name}.parquet');`);
            console.log(`[ OK  ]   ${name}.parquet`);
        };
        console.log(`[ RUN ] importing TPC-H SF ${scaleFactor}`);
        importTPCH('lineitem');
        importTPCH('customer');
        importTPCH('orders');
        importTPCH('region');
        importTPCH('nation');
        importTPCH('supplier');
        importTPCH('part');
        importTPCH('partsupp');
        connection.close();
        database.dropFiles();
        console.log(`[ OK  ] importing TPC-H SF ${scaleFactor}`);
    }

    static async afterGroup(database: duckdb.DuckDBBindings): Promise<void> {
        const connection = database.connect();
        connection.query('DROP TABLE IF EXISTS lineitem');
        connection.query('DROP TABLE IF EXISTS customer');
        connection.query('DROP TABLE IF EXISTS orders');
        connection.query('DROP TABLE IF EXISTS region');
        connection.query('DROP TABLE IF EXISTS nation');
        connection.query('DROP TABLE IF EXISTS supplier');
        connection.query('DROP TABLE IF EXISTS part');
        connection.query('DROP TABLE IF EXISTS partsupp');
        database.dropFiles();
        connection.close();
    }
}

export class DuckDBSyncParquetTPCHBenchmark implements SystemBenchmark {
    database: duckdb.DuckDBBindings;
    connection: duckdb.DuckDBConnection | null;
    scaleFactor: number;
    query: number;
    queryText: string | null;

    constructor(database: duckdb.DuckDBBindings, scaleFactor: number, query: number) {
        this.database = database;
        this.connection = null;
        this.scaleFactor = scaleFactor;
        this.query = query;
        this.queryText = null;
    }
    getName(): string {
        return `duckdb_sync_tpch_parquet_${this.scaleFactor.toString().replace('.', '')}_q${this.query}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'tpch',
            system: 'duckdb',
            tags: ['sync', 'parquet'],
            timestamp: +new Date(),
            parameters: [this.scaleFactor, this.query],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        this.queryText = await getTPCHQuery(ctx.projectRootPath, `${this.query}.sql`);
        this.connection = this.database.connect();
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection!.query(this.queryText!);
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {}
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {}

    static async beforeGroup(
        database: duckdb.DuckDBBindings,
        ctx: SystemBenchmarkContext,
        scaleFactor: number,
    ): Promise<void> {
        const connection = database.connect();
        const importTPCH = (name: string) => {
            console.log(`[ RUN ]   ${name}.parquet`);
            const path = getTPCHParquetFilePath(ctx.projectRootPath, scaleFactor, `${name}.parquet`);
            database.registerFileURL(`${name}.parquet`, path, duckdb.DuckDBDataProtocol.NODE_FS, false);
            connection!.query(`CREATE VIEW ${name} AS SELECT * FROM parquet_scan('${name}.parquet');`);
            console.log(`[ OK  ]   ${name}.parquet`);
        };
        console.log(`[ RUN ] create parquet views TPC-H SF ${scaleFactor}`);
        importTPCH('lineitem');
        importTPCH('customer');
        importTPCH('orders');
        importTPCH('region');
        importTPCH('nation');
        importTPCH('supplier');
        importTPCH('part');
        importTPCH('partsupp');
        connection.close();
        console.log(`[ OK  ] create parquet views TPC-H SF ${scaleFactor}`);
    }

    static async afterGroup(database: duckdb.DuckDBBindings): Promise<void> {
        const connection = database.connect();
        connection.query('DROP VIEW IF EXISTS lineitem');
        connection.query('DROP VIEW IF EXISTS customer');
        connection.query('DROP VIEW IF EXISTS orders');
        connection.query('DROP VIEW IF EXISTS region');
        connection.query('DROP VIEW IF EXISTS nation');
        connection.query('DROP VIEW IF EXISTS supplier');
        connection.query('DROP VIEW IF EXISTS part');
        connection.query('DROP VIEW IF EXISTS partsupp');
        database.dropFiles();
        connection.close();
    }
}

export class DuckDBSyncIntegerSortBenchmark implements SystemBenchmark {
    database: duckdb.DuckDBBindings;
    connection: duckdb.DuckDBConnection | null;
    tuples: number;
    columnCount: number;
    orderBy: string[];

    constructor(database: duckdb.DuckDBBindings, tuples: number, columnCount: number, orderCriteria: number) {
        this.database = database;
        this.connection = null;
        this.columnCount = columnCount;
        this.tuples = tuples;
        this.orderBy = [];
        for (let i = 0; i < orderCriteria; ++i) {
            this.orderBy.push(`v${i}`);
        }
    }
    getName(): string {
        return `duckdb_sync_integer_sort_${this.tuples}_${this.columnCount}_${this.orderBy.length}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_sort',
            system: 'duckdb',
            tags: ['sync'],
            timestamp: +new Date(),
            parameters: [this.tuples, this.columnCount, this.orderBy.length],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        const [schema, batches] = generateArrowXInt32(this.tuples, this.columnCount);
        this.connection = this.database.connect();
        this.connection.insertArrowTable(new arrow.Table(schema, batches), {
            schema: 'main',
            name: this.getName(),
        });
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const result = this.connection!.query<{ v0: arrow.Int32 }>(
            `SELECT * FROM ${this.getName()} ORDER BY (${this.orderBy.join(',')})`,
        );
        let n = 0;
        for (const v of result.getChildAt(0)!) {
            noop(v);
            n += 1;
        }
        if (this.tuples !== n) {
            throw Error(`invalid tuple count. expected ${this.tuples}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.query(`DROP TABLE IF EXISTS ${this.getName()}`);
        this.connection?.close();
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.query(`DROP TABLE IF EXISTS ${this.getName()}`);
        this.connection?.close();
    }
}

export class DuckDBSyncIntegerTopKBenchmark implements SystemBenchmark {
    database: duckdb.DuckDBBindings;
    connection: duckdb.DuckDBConnection | null;
    tuples: number;
    columnCount: number;
    orderBy: string[];
    k: number;

    constructor(
        database: duckdb.DuckDBBindings,
        tuples: number,
        columnCount: number,
        orderCriteria: number,
        k: number,
    ) {
        this.database = database;
        this.connection = null;
        this.columnCount = columnCount;
        this.tuples = tuples;
        this.orderBy = [];
        this.k = k;
        for (let i = 0; i < orderCriteria; ++i) {
            this.orderBy.push(`v${i}`);
        }
    }
    getName(): string {
        return `duckdb_sync_integer_topk_${this.tuples}_${this.columnCount}_${this.orderBy.length}_${this.k}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_topk',
            system: 'duckdb',
            tags: ['sync'],
            timestamp: +new Date(),
            parameters: [this.tuples, this.columnCount, this.orderBy.length, this.k],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        const [schema, batches] = generateArrowXInt32(this.tuples, this.columnCount);
        this.connection = this.database.connect();
        this.connection.insertArrowTable(new arrow.Table(schema, batches), {
            schema: 'main',
            name: this.getName(),
        });
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const result = this.connection!.query<{ v0: arrow.Int32 }>(
            `SELECT * FROM ${this.getName()} ORDER BY (${this.orderBy.join(',')}) LIMIT ${this.k}`,
        );
        let n = 0;
        for (const v of result.getChildAt(0)!) {
            noop(v);
            n += 1;
        }
        if (n !== this.k) {
            throw Error(`invalid tuple count. expected ${this.k}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.query(`DROP TABLE IF EXISTS ${this.getName()}`);
        this.connection?.close();
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.query(`DROP TABLE IF EXISTS ${this.getName()}`);
        this.connection?.close();
    }
}

export class DuckDBSyncIntegerSumBenchmark implements SystemBenchmark {
    database: duckdb.DuckDBBindings;
    connection: duckdb.DuckDBConnection | null;
    tuples: number;
    groupSize: number;

    constructor(database: duckdb.DuckDBBindings, tuples: number, groupSize: number) {
        this.database = database;
        this.connection = null;
        this.tuples = tuples;
        this.groupSize = groupSize;
    }
    getName(): string {
        return `duckdb_sync_integer_sum_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_sum',
            system: 'duckdb',
            tags: ['sync'],
            timestamp: +new Date(),
            parameters: [this.tuples, this.groupSize],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        const [schema, batches] = generateArrowGroupedInt32(this.tuples, this.groupSize);
        this.connection = this.database.connect();
        this.connection.insertArrowTable(new arrow.Table(schema, batches), {
            schema: 'main',
            name: this.getName(),
        });
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const result = this.connection!.query<{ v0: arrow.Int32 }>(`SELECT SUM(v1) FROM ${this.getName()} GROUP BY v0`);
        let n = 0;
        for (const v of result.getChildAt(0)!) {
            noop(v);
            n += 1;
        }
        const expectedGroups = this.tuples / this.groupSize;
        if (n !== expectedGroups) {
            throw Error(`invalid tuple count. expected ${expectedGroups}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.query(`DROP TABLE IF EXISTS ${this.getName()}`);
        this.connection?.close();
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.query(`DROP TABLE IF EXISTS ${this.getName()}`);
        this.connection?.close();
    }
}

export class DuckDBSyncCSVSumBenchmark implements SystemBenchmark {
    database: duckdb.DuckDBBindings;
    connection: duckdb.DuckDBConnection | null;
    tuples: number;
    groupSize: number;

    constructor(database: duckdb.DuckDBBindings, tuples: number, groupSize: number) {
        this.database = database;
        this.connection = null;
        this.tuples = tuples;
        this.groupSize = groupSize;
    }
    getName(): string {
        return `duckdb_sync_csv_sum_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'csv_sum',
            system: 'duckdb',
            tags: ['sync'],
            timestamp: +new Date(),
            parameters: [this.tuples, this.groupSize],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        const csv = generateCSVGroupedInt32(this.tuples, this.groupSize);
        const encoder = new TextEncoder();
        const buffer = encoder.encode(csv);
        this.database.registerFileBuffer('TEMP', buffer);
        this.connection = this.database.connect();
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const result = this.connection!.query(
            `SELECT SUM(v1) FROM read_csv('TEMP', delim = '|', header = False, columns={'v0': 'INTEGER', 'v1': 'INTEGER'}) GROUP BY v0`,
        );
        let n = 0;
        for (const v of result.getChildAt(0)!) {
            noop(v);
            n += 1;
        }
        const expectedGroups = this.tuples / this.groupSize;
        if (n !== expectedGroups) {
            throw Error(`invalid tuple count. expected ${expectedGroups}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database.dropFile('TEMP');
        this.connection?.close();
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database.dropFile('TEMP');
        this.connection?.close();
    }
}

export class DuckDBSyncRegexBenchmark implements SystemBenchmark {
    database: duckdb.DuckDBBindings;
    connection: duckdb.DuckDBConnection | null;
    tuples: number;
    chars: number;

    constructor(database: duckdb.DuckDBBindings, tuples: number, chars: number) {
        this.database = database;
        this.connection = null;
        this.tuples = tuples;
        this.chars = chars;
    }
    getName(): string {
        return `duckdb_sync_regex_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'regex',
            system: 'duckdb',
            tags: ['sync'],
            timestamp: +new Date(),
            parameters: [this.tuples, this.chars],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        const [schema, batches] = generateArrowUtf8(this.tuples, this.chars);
        this.connection = this.database.connect();
        this.connection.insertArrowTable(new arrow.Table(schema, batches), {
            schema: 'main',
            name: this.getName(),
        });
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const result = this.connection!.query<{ v0: arrow.Int32 }>(
            `SELECT * FROM ${this.getName()} WHERE v0 LIKE '_#%'`,
        );
        let n = 0;
        for (const v of result.getChildAt(0)!) {
            noop(v);
            n += 1;
        }
        if (n !== 10) {
            throw Error(`invalid tuple count. expected 10, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.query(`DROP TABLE IF EXISTS ${this.getName()}`);
        this.connection?.close();
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.query(`DROP TABLE IF EXISTS ${this.getName()}`);
        this.connection?.close();
    }
}

export class DuckDBSyncIntegerJoin2Benchmark implements SystemBenchmark {
    database: duckdb.DuckDBBindings;
    connection: duckdb.DuckDBConnection | null;
    tuplesA: number;
    tuplesB: number;
    stepAB: number;
    filterA: number;

    constructor(database: duckdb.DuckDBBindings, a: number, b: number, filterA: number, stepAB: number) {
        this.database = database;
        this.connection = null;
        this.tuplesA = a;
        this.tuplesB = b;
        this.filterA = filterA;
        this.stepAB = stepAB;
    }
    getName(): string {
        return `duckdb_sync_integer_join2_${this.tuplesA}_${this.tuplesB}_${this.stepAB}_${this.filterA}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_join2',
            system: 'duckdb',
            tags: ['sync'],
            timestamp: +new Date(),
            parameters: [this.tuplesA, this.tuplesB, this.stepAB, this.filterA],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        const [schemaA, batchesA] = generateArrowInt32(this.tuplesA);
        const [schemaB, batchesB] = generateArrow2Int32(this.tuplesB, this.stepAB);
        this.connection = this.database.connect();
        this.connection.insertArrowTable(new arrow.Table(schemaA, batchesA), {
            schema: 'main',
            name: `${this.getName()}_a`,
        });
        this.connection.insertArrowTable(new arrow.Table(schemaB, batchesB), {
            schema: 'main',
            name: `${this.getName()}_b`,
        });
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const result = this.connection!.query<{ v0: arrow.Int32 }>(`
            SELECT *
            FROM ${this.getName()}_a a, ${this.getName()}_b b
            WHERE a.v0 = b.v1
            AND a.v0 < ${this.filterA}
        `);
        let n = 0;
        for (const v of result.getChildAt(0)!) {
            noop(v);
            n += 1;
        }
        const expected = this.filterA * this.stepAB;
        if (n !== expected) {
            throw Error(`invalid tuple count. expected ${expected}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.query(`DROP TABLE IF EXISTS ${this.getName()}_a`);
        this.connection?.query(`DROP TABLE IF EXISTS ${this.getName()}_b`);
        this.connection?.close();
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.query(`DROP TABLE IF EXISTS ${this.getName()}_a`);
        this.connection?.query(`DROP TABLE IF EXISTS ${this.getName()}_b`);
        this.connection?.close();
    }
}

export class DuckDBSyncIntegerJoin3Benchmark implements SystemBenchmark {
    database: duckdb.DuckDBBindings;
    connection: duckdb.DuckDBConnection | null;
    tuplesA: number;
    tuplesB: number;
    tuplesC: number;
    stepAB: number;
    stepBC: number;
    filterA: number;

    constructor(
        database: duckdb.DuckDBBindings,
        a: number,
        b: number,
        c: number,
        filterA: number,
        stepAB: number,
        stepBC: number,
    ) {
        this.database = database;
        this.connection = null;
        this.tuplesA = a;
        this.tuplesB = b;
        this.tuplesC = c;
        this.stepAB = stepAB;
        this.stepBC = stepBC;
        this.filterA = filterA;
    }
    getName(): string {
        return `duckdb_sync_integer_join3_${this.tuplesA}_${this.tuplesB}_${this.tuplesC}_${this.filterA}_${this.stepAB}_${this.stepBC}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_join3',
            system: 'duckdb',
            tags: ['sync'],
            timestamp: +new Date(),
            parameters: [this.tuplesA, this.tuplesB, this.tuplesC, this.stepAB, this.stepBC, this.filterA],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        const [schemaA, batchesA] = generateArrowInt32(this.tuplesA);
        const [schemaB, batchesB] = generateArrow2Int32(this.tuplesB, this.stepAB);
        const [schemaC, batchesC] = generateArrow2Int32(this.tuplesC, this.stepBC);
        this.connection = this.database.connect();
        this.connection.insertArrowTable(new arrow.Table(schemaA, batchesA), {
            schema: 'main',
            name: `${this.getName()}_a`,
        });
        this.connection.insertArrowTable(new arrow.Table(schemaB, batchesB), {
            schema: 'main',
            name: `${this.getName()}_b`,
        });
        this.connection.insertArrowTable(new arrow.Table(schemaC, batchesC), {
            schema: 'main',
            name: `${this.getName()}_c`,
        });
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const result = this.connection!.query<{ v0: arrow.Int32 }>(`
            SELECT *
            FROM ${this.getName()}_a a, ${this.getName()}_b b, ${this.getName()}_c c
            WHERE a.v0 = b.v1
            AND b.v0 = c.v1
            AND a.v0 < ${this.filterA}
        `);
        let n = 0;
        for (const v of result.getChildAt(0)!) {
            noop(v);
            n += 1;
        }
        const expected = this.filterA * this.stepAB * this.stepBC;
        if (n !== expected) {
            throw Error(`invalid tuple count. expected ${expected}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.query(`DROP TABLE IF EXISTS ${this.getName()}_a`);
        this.connection?.query(`DROP TABLE IF EXISTS ${this.getName()}_b`);
        this.connection?.query(`DROP TABLE IF EXISTS ${this.getName()}_c`);
        this.connection?.close();
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.query(`DROP TABLE IF EXISTS ${this.getName()}_a`);
        this.connection?.query(`DROP TABLE IF EXISTS ${this.getName()}_b`);
        this.connection?.query(`DROP TABLE IF EXISTS ${this.getName()}_c`);
        this.connection?.close();
    }
}
