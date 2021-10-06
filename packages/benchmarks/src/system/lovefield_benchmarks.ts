import * as lf from 'lovefield-ts/dist/es6/lf.js';
import * as faker from 'faker';
import { SystemBenchmark, SystemBenchmarkMetadata, SystemBenchmarkContext, noop } from './system_benchmark';
import { shuffle } from '../utils';

export class LovefieldIntegerScanBenchmark implements SystemBenchmark {
    builder?: lf.Builder | null;
    database?: lf.DatabaseConnection | null;
    tuples: number;

    constructor(tuples: number) {
        this.builder = null;
        this.database = null;
        this.tuples = tuples;
    }
    getName(): string {
        return `lovefield_integer_scan_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_scan',
            system: 'lovefield',
            tags: [],
            timestamp: new Date(),
            parameters: [this.tuples],
            throughputTuples: this.tuples,
            throughputBytes: this.tuples * 4,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);

        // Create table
        this.builder = lf.schema.create(`${this.getName()}_schema`, 1);
        const tableBuilder = this.builder!.createTable(this.getName());
        tableBuilder.addColumn('v0', lf.Type.INTEGER);

        // Get table
        this.database = await this.builder!.connect({ storeType: lf.DataStoreType.MEMORY });
        const table = this.database!.getSchema().table(this.getName());
        const rows = [];
        for (let i = 0; i < this.tuples; ++i) {
            rows.push(table.createRow({ v: i }));
        }
        shuffle(rows);

        // Insert values
        await this.database!.insert().into(table).values(rows).exec();
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const table = this.database!.getSchema().table(this.getName());
        const rows = (await this.database!.select().from(table).exec()) as Iterable<{ v: number }>;
        let n = 0;
        for (const row of rows) {
            noop(row);
            n += 1;
        }
        if (n !== this.tuples) {
            throw Error(`invalid tuple count. expected ${this.tuples}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database!.close();
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database!.close();
    }
}
