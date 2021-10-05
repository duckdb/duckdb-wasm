import * as faker from 'faker';
import * as nano from '@nano-sql/core';
import { SystemBenchmark, SystemBenchmarkContext, noop } from './system_benchmark';
import { shuffle } from '../utils';

export class NanoSQLSimpleScanBenchmark implements SystemBenchmark {
    database: nano.nanoSQL | null;
    tupleCount: number;

    constructor(tupleCount: number) {
        this.database = null;
        this.tupleCount = tupleCount;
    }
    getName(): string {
        return `scan_benchmark_${this.tupleCount}`;
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        await this.database!.dropDatabase(this.getName());
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);

        // Create the database & table
        this.database = await nano.nSQL().createDatabase({
            id: this.getName(),
            mode: 'TEMP',
        });
        await this.database!.query('create table', {
            name: this.getName(),
            model: {
                'v:int': {},
            },
        }).exec();

        // Generate values
        const values = [];
        for (let i = 0; i < this.tupleCount; ++i) {
            values.push({ v: i });
        }
        shuffle(values);

        // Insert values
        await this.database!.loadJS(values);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        for (const row of await this.database!.query('select', ['v']).exec()) {
            noop(row);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        await this.database!.dropDatabase(this.getName());
    }
}

export class NanoSQLSimpleSumBenchmark implements SystemBenchmark {
    database: nano.nanoSQL | null;
    tupleCount: number;

    constructor(tupleCount: number) {
        this.database = null;
        this.tupleCount = tupleCount;
    }
    getName(): string {
        return `sum_benchmark_${this.tupleCount}`;
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        this.database = await nano.nSQL().createDatabase({
            id: this.getName(),
            mode: 'TEMP',
        });
        const values = [];
        for (let i = 0; i < this.tupleCount; ++i) {
            values.push({ v: i });
        }
        shuffle(values);
        await this.database!.query('create table', {
            name: this.getName(),
            model: {
                'v:int': {},
            },
        }).exec();
        await this.database!.loadJS(values);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        for (const row of await this.database!.query('select', ['sum(v)']).exec()) {
            noop(row);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        await this.database!.dropDatabase(this.getName());
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        await this.database!.dropDatabase(this.getName());
    }
}
