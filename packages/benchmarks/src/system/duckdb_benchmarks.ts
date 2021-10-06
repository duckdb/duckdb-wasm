import * as arrow from 'apache-arrow';
import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb.module';
import * as faker from 'faker';
import { SystemBenchmark, SystemBenchmarkMetadata, SystemBenchmarkContext, noop } from './system_benchmark';
import { shuffle } from '../utils';

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
            tuples: this.tuples,
            bytes: this.tuples * 4,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const values = [];
        for (let i = 0; i < this.tuples; ++i) {
            values.push({
                v: i,
            });
        }
        shuffle(values);
        const schema = new arrow.Schema([new arrow.Field('v', new arrow.Int32())]);
        const batches = [];
        for (let i = 0; i < this.tuples; ) {
            const n = Math.min(1000, this.tuples - i);
            batches.push(new arrow.RecordBatch(schema, n, [arrow.Int32Vector.from(values.slice(i, i + n))]));
            i += n;
        }
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
            tuples: this.tuples,
            bytes: this.tuples * 4,
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
            tuples: this.tuples,
            bytes: this.tuples * 4,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const values = [];
        for (let i = 0; i < this.tuples; ++i) {
            values.push({
                v: i,
            });
        }
        shuffle(values);
        const schema = new arrow.Schema([new arrow.Field('v', new arrow.Int32())]);
        const batches = [];
        for (let i = 0; i < this.tuples; ) {
            const n = Math.min(1000, this.tuples - i);
            batches.push(new arrow.RecordBatch(schema, n, [arrow.Int32Vector.from(values.slice(i, i + n))]));
            i += n;
        }
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
            tuples: this.tuples,
            bytes: this.tuples * 4,
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
