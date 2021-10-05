import * as faker from 'faker';
import * as nano from '@nano-sql/core';
import { SystemBenchmark, SystemBenchmarkContext, noop } from './system_benchmark';
import { shuffle } from '../utils';

export class NanoSQLSimpleScanBenchmark implements SystemBenchmark {
    tuples: number;

    constructor(tuples: number) {
        this.tuples = tuples;
    }
    getName(): string {
        return `nanosql_scan_${this.tuples}`;
    }
    getMetadata(): any {
        return {
            tuples: this.tuples,
            bytes: this.tuples * 4,
        };
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        await nano.nSQL().dropDatabase(this.getName());
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);

        // Create the database & table
        await nano.nSQL().createDatabase({
            id: this.getName(),
            mode: 'TEMP',
        });
        await nano
            .nSQL()
            .query('create table', {
                name: `${this.getName()}`,
                model: {
                    'v:int': {},
                },
            })
            .exec();

        // Generate values
        const rows = [];
        for (let i = 0; i < this.tuples; ++i) {
            rows.push({ v: i });
        }
        shuffle(rows);

        // Insert values
        await nano.nSQL(this.getName()).loadJS(rows);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        for (const row of await nano.nSQL(this.getName()).query('select', ['v']).exec()) {
            noop(row);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        await nano.nSQL().dropDatabase(this.getName());
    }
}

export class NanoSQLSimpleSumBenchmark implements SystemBenchmark {
    tuples: number;

    constructor(tuples: number) {
        this.tuples = tuples;
    }
    getName(): string {
        return `nanosql_scan_${this.tuples}`;
    }
    getMetadata(): any {
        return {
            tuples: this.tuples,
            bytes: this.tuples * 4,
        };
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        await nano.nSQL().dropDatabase(this.getName());
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);

        // Create the database & table
        await nano.nSQL().createDatabase({
            id: this.getName(),
            mode: 'TEMP',
        });
        await nano
            .nSQL()
            .query('create table', {
                name: `${this.getName()}`,
                model: {
                    'v:int': {},
                },
            })
            .exec();

        // Generate values
        const rows = [];
        for (let i = 0; i < this.tuples; ++i) {
            rows.push({ v: i });
        }
        shuffle(rows);

        // Insert values
        await nano.nSQL(this.getName()).loadJS(rows);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        for (const row of await nano.nSQL(this.getName()).query('select', ['sum(v)']).exec()) {
            noop(row);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        await nano.nSQL().dropDatabase(this.getName());
    }
}
