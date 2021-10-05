import * as lf from 'lovefield-ts/dist/es6/lf.js';
import * as faker from 'faker';
import { SystemBenchmark, SystemBenchmarkContext, noop } from './system_benchmark';
import { shuffle } from '../utils';

export class LovefieldSimpleScanBenchmark implements SystemBenchmark {
    builder?: lf.Builder | null;
    database?: lf.DatabaseConnection | null;
    tupleCount: number;

    constructor(tupleCount: number) {
        this.builder = null;
        this.database = null;
        this.tupleCount = tupleCount;
    }
    getName(): string {
        return `scan_benchmark_${this.tupleCount}`;
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);

        // Create table
        this.builder = lf.schema.create(`${this.getName()}_schema`, 1);
        this.database = await this.builder!.connect({ storeType: lf.DataStoreType.MEMORY });
        const tableBuilder = this.builder!.createTable(this.getName());
        tableBuilder.addColumn('v', lf.Type.INTEGER);
        const table = this.database!.getSchema().table(this.getName());

        // Generate values
        const rows = [];
        for (let i = 0; i < this.tupleCount; ++i) {
            rows.push(table.createRow({ v: i }));
        }
        shuffle(rows);

        // Insert values
        await this.database!.insert().into(table).values(rows).exec();
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const table = this.database!.getSchema().table(this.getName());
        const rows = (await this.database!.select().from(table).exec()) as Iterable<{ a: number }>;
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
