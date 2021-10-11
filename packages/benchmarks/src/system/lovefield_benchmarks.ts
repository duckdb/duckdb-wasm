import * as lf from 'lovefield-ts/dist/es6/lf.js';
import * as faker from 'faker';
import { SystemBenchmark, SystemBenchmarkMetadata, SystemBenchmarkContext, noop } from './system_benchmark';
import { shuffle } from '../utils';
import { generateUtf8 } from './data_generator';

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
            timestamp: +new Date(),
            parameters: [this.tuples],
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
            rows.push(table.createRow({ v0: i }));
        }
        shuffle(rows);

        // Insert values
        await this.database!.insert().into(table).values(rows).exec();
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const table = this.database!.getSchema().table(this.getName());
        const rows = (await this.database!.select().from(table).exec()) as Iterable<{ v0: number }>;
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
        const table = this.database!.getSchema().table(this.getName());
        await this.database!.delete().from(table).exec();
        this.database!.close();
    }
    async onError(ctx: SystemBenchmarkContext): Promise<void> {
        await this.afterAll(ctx);
    }
}

export class LovefieldVarcharScanBenchmark implements SystemBenchmark {
    builder?: lf.Builder | null;
    database?: lf.DatabaseConnection | null;
    tuples: number;
    chars: number;

    constructor(tuples: number, chars: number) {
        this.builder = null;
        this.database = null;
        this.tuples = tuples;
        this.chars = chars;
    }
    getName(): string {
        return `lovefield_varchar_scan_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'varchar_scan',
            system: 'lovefield',
            tags: [],
            timestamp: +new Date(),
            parameters: [this.tuples, this.chars],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);

        // Create table
        this.builder = lf.schema.create(`${this.getName()}_schema`, 1);
        const tableBuilder = this.builder!.createTable(this.getName());
        tableBuilder.addColumn('v0', lf.Type.STRING);

        // Get table
        this.database = await this.builder!.connect({ storeType: lf.DataStoreType.MEMORY });
        const table = this.database!.getSchema().table(this.getName());
        const rows = [];
        for (const value of generateUtf8(this.tuples, this.chars)) {
            rows.push(table.createRow({ v0: value }));
        }

        // Insert values
        await this.database!.insert().into(table).values(rows).exec();
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const table = this.database!.getSchema().table(this.getName());
        const rows = (await this.database!.select().from(table).exec()) as Iterable<{ v0: number }>;
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
        const table = this.database!.getSchema().table(this.getName());
        await this.database!.delete().from(table).exec();
        this.database!.close();
    }
    async onError(ctx: SystemBenchmarkContext): Promise<void> {
        await this.afterAll(ctx);
    }
}

export class LovefieldRegexScanBenchmark implements SystemBenchmark {
    builder?: lf.Builder | null;
    database?: lf.DatabaseConnection | null;
    tuples: number;
    chars: number;

    constructor(tuples: number, chars: number) {
        this.builder = null;
        this.database = null;
        this.tuples = tuples;
        this.chars = chars;
    }
    getName(): string {
        return `lovefield_regex_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'regex',
            system: 'lovefield',
            tags: [],
            timestamp: +new Date(),
            parameters: [this.tuples, this.chars],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);

        // Create table
        this.builder = lf.schema.create(`${this.getName()}_schema`, 1);
        const tableBuilder = this.builder!.createTable(this.getName());
        tableBuilder.addColumn('v0', lf.Type.STRING);

        // Get table
        this.database = await this.builder!.connect({ storeType: lf.DataStoreType.MEMORY });
        const table = this.database!.getSchema().table(this.getName());
        const rows = [];
        for (const value of generateUtf8(this.tuples, this.chars)) {
            rows.push(table.createRow({ v0: value }));
        }

        // Insert values
        await this.database!.insert().into(table).values(rows).exec();
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const table = this.database!.getSchema().table(this.getName());
        const rows = (await this.database!.select()
            .from(table)
            .where(table.col('v0').match(/^.#.*/))
            .exec()) as Iterable<{
            v0: number;
        }>;
        let n = 0;
        for (const row of rows) {
            noop(row);
            n += 1;
        }
        if (n !== 10) {
            throw Error(`invalid tuple count. expected 10, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        const table = this.database!.getSchema().table(this.getName());
        await this.database!.delete().from(table).exec();
        this.database!.close();
    }
    async onError(ctx: SystemBenchmarkContext): Promise<void> {
        await this.afterAll(ctx);
    }
}
