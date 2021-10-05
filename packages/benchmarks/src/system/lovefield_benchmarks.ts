import * as lf from 'lovefield-ts/dist/es6/lf.js';
import * as faker from 'faker';
import { SystemBenchmark, SystemBenchmarkContext, noop } from './system_benchmark';
import { shuffle } from '../utils';

export class LovefieldSimpleScanBenchmark implements SystemBenchmark {
    builder?: lf.Builder | null;
    database?: lf.DatabaseConnection | null;
    tuples: number;

    constructor(tuples: number) {
        this.builder = null;
        this.database = null;
        this.tuples = tuples;
    }
    getName(): string {
        return `lovefield_scan_${this.tuples}`;
    }
    getMetadata(): any {
        return {
            tuples: this.tuples,
            bytes: this.tuples * 4,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);

        // Create table
        this.builder = lf.schema.create(`${this.getName()}_schema`, 1);
        const tableBuilder = this.builder!.createTable(this.getName());
        tableBuilder.addColumn('v', lf.Type.INTEGER);

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
        for (const row of rows) {
            noop(row);
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
