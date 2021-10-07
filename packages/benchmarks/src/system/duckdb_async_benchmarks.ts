import * as arrow from 'apache-arrow';
import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb-esm';
import * as faker from 'faker';
import { SystemBenchmark, SystemBenchmarkMetadata, SystemBenchmarkContext, noop } from './system_benchmark';
import { generateArrowInt32 } from './data_generator';

export class DuckDBAsyncIntegerScanBenchmark implements SystemBenchmark {
    database: duckdb.AsyncDuckDB;
    connection: duckdb.AsyncDuckDBConnection | null;
    tuples: number;

    constructor(database: duckdb.AsyncDuckDB, tuples: number) {
        this.database = database;
        this.connection = null;
        this.tuples = tuples;
    }
    getName(): string {
        return `duckdb_async_integer_scan_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_scan',
            system: 'duckdb',
            tags: ['async'],
            timestamp: new Date(),
            parameters: [this.tuples],
            throughputTuples: this.tuples,
            throughputBytes: this.tuples * 4,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const [schema, batches] = generateArrowInt32(this.tuples);
        this.connection = await this.database.connect();
        await this.connection.insertArrowBatches(schema, batches, {
            schema: 'main',
            name: this.getName(),
        });
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const result = await this.connection!.runQuery<{ v0: arrow.Int32 }>(`SELECT * FROM ${this.getName()}`);
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
