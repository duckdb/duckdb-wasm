import * as arrow from 'apache-arrow';
import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb-esm';
import * as faker from 'faker';
import { SystemBenchmark, SystemBenchmarkMetadata, SystemBenchmarkContext, noop } from './system_benchmark';
import { generateArrowInt32Table, generateArrowUtf8Table, generateArrow2Int32Table } from './data_generator';

export class DuckDBSyncMaterializingIntegerScanBenchmark implements SystemBenchmark {
    database: duckdb.DuckDBBindings;
    connection: duckdb.DuckDBConnection | null;
    tuples: number;

    constructor(database: duckdb.DuckDBBindings, tuples: number) {
        this.database = database;
        this.connection = null;
        this.tuples = tuples;
    }
    getName(): string {
        return `duckdb_sync_materializing_integer_scan_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_scan',
            system: 'duckdb',
            tags: ['sync', 'materializing'],
            timestamp: new Date(),
            parameters: [this.tuples],
            throughputTuples: this.tuples,
            throughputBytes: this.tuples * 4,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const [schema, batches] = generateArrowInt32Table(this.tuples);
        this.connection = this.database.connect();
        this.connection.insertArrowBatches(schema, batches, {
            schema: 'main',
            name: this.getName(),
        });
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const result = this.connection!.runQuery<{ v: arrow.Int32 }>(`SELECT * FROM ${this.getName()}`);
        let n = 0;
        for (const v of result.getChildAt(0)!) {
            noop(v);
            n += 1;
        }
        if (n !== this.tuples) {
            throw Error(`invalid tuple count. expected ${this.tuples}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.runQuery(`DROP TABLE IF EXISTS ${this.getName()}`);
        this.connection?.close();
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.runQuery(`DROP TABLE IF EXISTS ${this.getName()}`);
        this.connection?.close();
    }
}

export class DuckDBSyncStreamingIntegerScanBenchmark extends DuckDBSyncMaterializingIntegerScanBenchmark {
    constructor(database: duckdb.DuckDBBindings, tuples: number) {
        super(database, tuples);
    }
    getName(): string {
        return `duckdb_sync_streaming_integer_scan_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_scan',
            system: 'duckdb',
            tags: ['sync', 'streaming'],
            timestamp: new Date(),
            parameters: [this.tuples],
            throughputTuples: this.tuples,
            throughputBytes: this.tuples * 4,
        };
    }
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const stream = this.connection!.sendQuery<{ v: arrow.Int32 }>(`SELECT * FROM ${this.getName()}`);
        let n = 0;
        for (const batch of stream) {
            for (const v of batch.getChildAt(0)!) {
                noop(v);
                n += 1;
            }
        }
        if (n !== this.tuples) {
            throw Error(`invalid tuple count. expected ${this.tuples}, received ${n}`);
        }
    }
}

export class DuckDBAsyncMaterializingIntegerScanBenchmark implements SystemBenchmark {
    database: duckdb.AsyncDuckDB;
    connection: duckdb.AsyncDuckDBConnection | null;
    tuples: number;

    constructor(database: duckdb.AsyncDuckDB, tuples: number) {
        this.database = database;
        this.connection = null;
        this.tuples = tuples;
    }
    getName(): string {
        return `duckdb_async_materializing_integer_scan_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_scan',
            system: 'duckdb',
            tags: ['async', 'materializing'],
            timestamp: new Date(),
            parameters: [this.tuples],
            throughputTuples: this.tuples,
            throughputBytes: this.tuples * 4,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const [schema, batches] = generateArrowInt32Table(this.tuples);
        this.connection = await this.database.connect();
        await this.connection.insertArrowBatches(schema, batches, {
            schema: 'main',
            name: this.getName(),
        });
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const result = await this.connection!.runQuery<{ v: arrow.Int32 }>(`SELECT * FROM ${this.getName()}`);
        let n = 0;
        for (const v of result.getChildAt(0)!) {
            noop(v);
            n += 1;
        }
        if (n !== this.tuples) {
            throw Error(`invalid tuple count. expected ${this.tuples}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.runQuery(`DROP TABLE IF EXISTS ${this.getName()}`);
        this.connection?.close();
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.runQuery(`DROP TABLE IF EXISTS ${this.getName()}`);
        this.connection?.close();
    }
}

export class DuckDBAsyncStreamingIntegerScanBenchmark extends DuckDBAsyncMaterializingIntegerScanBenchmark {
    constructor(database: duckdb.AsyncDuckDB, tuples: number) {
        super(database, tuples);
    }
    getName(): string {
        return `duckdb_async_streaming_integer_scan_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_scan',
            system: 'duckdb',
            tags: ['async', 'streaming'],
            timestamp: new Date(),
            parameters: [this.tuples],
            throughputTuples: this.tuples,
            throughputBytes: this.tuples * 4,
        };
    }
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const stream = await this.connection!.sendQuery<{ v: arrow.Int32 }>(`SELECT * FROM ${this.getName()}`);
        let n = 0;
        for await (const batch of stream) {
            for (const v of batch.getChildAt(0)!) {
                noop(v);
                n += 1;
            }
        }
        if (n !== this.tuples) {
            throw Error(`invalid tuple count. expected ${this.tuples}, received ${n}`);
        }
    }
}

export class DuckDBSyncMaterializingVarcharScanBenchmark implements SystemBenchmark {
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
        return `duckdb_sync_materializing_varchar_scan_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'varchar_scan',
            system: 'duckdb',
            tags: ['sync', 'materializing'],
            timestamp: new Date(),
            parameters: [this.tuples],
            throughputTuples: this.tuples,
            throughputBytes: this.tuples * this.chars,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const [schema, batches] = generateArrowUtf8Table(this.tuples, this.chars);
        this.connection = this.database.connect();
        this.connection.insertArrowBatches(schema, batches, {
            schema: 'main',
            name: this.getName(),
        });
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const result = this.connection!.runQuery<{ v: arrow.Int32 }>(`SELECT * FROM ${this.getName()}`);
        let n = 0;
        for (const v of result.getChildAt(0)!) {
            noop(v);
            n += 1;
        }
        if (n !== this.tuples) {
            throw Error(`invalid tuple count. expected ${this.tuples}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.runQuery(`DROP TABLE IF EXISTS ${this.getName()}`);
        this.connection?.close();
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.runQuery(`DROP TABLE IF EXISTS ${this.getName()}`);
        this.connection?.close();
    }
}

export class DuckDBSyncMaterializingRegexBenchmark implements SystemBenchmark {
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
        return `duckdb_sync_materializing_regex_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'regex',
            system: 'duckdb',
            tags: ['sync', 'materializing'],
            timestamp: new Date(),
            parameters: [this.tuples],
            throughputTuples: this.tuples,
            throughputBytes: this.tuples * this.chars,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const [schema, batches] = generateArrowUtf8Table(this.tuples, this.chars);
        this.connection = this.database.connect();
        this.connection.insertArrowBatches(schema, batches, {
            schema: 'main',
            name: this.getName(),
        });
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const result = this.connection!.runQuery<{ v0: arrow.Int32 }>(
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
        this.connection?.runQuery(`DROP TABLE IF EXISTS ${this.getName()}`);
        this.connection?.close();
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.runQuery(`DROP TABLE IF EXISTS ${this.getName()}`);
        this.connection?.close();
    }
}

export class DuckDBSyncMaterializingIntegerJoin2Benchmark implements SystemBenchmark {
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
        return `duckdb_sync_materializing_integer_join2_${this.tuplesA}_${this.tuplesB}_${this.stepAB}_${this.filterA}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_join2',
            system: 'duckdb',
            tags: ['sync', 'materializing'],
            timestamp: new Date(),
            parameters: [this.tuplesA, this.tuplesB, this.stepAB, this.filterA],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const [schemaA, batchesA] = generateArrowInt32Table(this.tuplesA);
        const [schemaB, batchesB] = generateArrow2Int32Table(this.tuplesB, this.stepAB);
        this.connection = this.database.connect();
        this.connection.insertArrowBatches(schemaA, batchesA, {
            schema: 'main',
            name: `${this.getName()}_a`,
        });
        this.connection.insertArrowBatches(schemaB, batchesB, {
            schema: 'main',
            name: `${this.getName()}_b`,
        });
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const result = this.connection!.runQuery<{ v: arrow.Int32 }>(`
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
        this.connection?.runQuery(`DROP TABLE IF EXISTS ${this.getName()}_a`);
        this.connection?.runQuery(`DROP TABLE IF EXISTS ${this.getName()}_b`);
        this.connection?.close();
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.runQuery(`DROP TABLE IF EXISTS ${this.getName()}_a`);
        this.connection?.runQuery(`DROP TABLE IF EXISTS ${this.getName()}_b`);
        this.connection?.close();
    }
}

export class DuckDBSyncMaterializingIntegerJoin3Benchmark implements SystemBenchmark {
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
        return `duckdb_sync_materializing_integer_join3_${this.tuplesA}_${this.tuplesB}_${this.tuplesC}_${this.filterA}_${this.stepAB}_${this.stepBC}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_join3',
            system: 'duckdb',
            tags: ['sync', 'materializing'],
            timestamp: new Date(),
            parameters: [this.tuplesA, this.tuplesB, this.tuplesC, this.stepAB, this.stepBC, this.filterA],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const [schemaA, batchesA] = generateArrowInt32Table(this.tuplesA);
        const [schemaB, batchesB] = generateArrow2Int32Table(this.tuplesB, this.stepAB);
        const [schemaC, batchesC] = generateArrow2Int32Table(this.tuplesC, this.stepBC);
        this.connection = this.database.connect();
        this.connection.insertArrowBatches(schemaA, batchesA, {
            schema: 'main',
            name: `${this.getName()}_a`,
        });
        this.connection.insertArrowBatches(schemaB, batchesB, {
            schema: 'main',
            name: `${this.getName()}_b`,
        });
        this.connection.insertArrowBatches(schemaC, batchesC, {
            schema: 'main',
            name: `${this.getName()}_c`,
        });
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const result = this.connection!.runQuery<{ v: arrow.Int32 }>(`
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
        this.connection?.runQuery(`DROP TABLE IF EXISTS ${this.getName()}_a`);
        this.connection?.runQuery(`DROP TABLE IF EXISTS ${this.getName()}_b`);
        this.connection?.runQuery(`DROP TABLE IF EXISTS ${this.getName()}_c`);
        this.connection?.close();
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.connection?.runQuery(`DROP TABLE IF EXISTS ${this.getName()}_a`);
        this.connection?.runQuery(`DROP TABLE IF EXISTS ${this.getName()}_b`);
        this.connection?.runQuery(`DROP TABLE IF EXISTS ${this.getName()}_c`);
        this.connection?.close();
    }
}
