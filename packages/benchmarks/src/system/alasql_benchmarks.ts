import * as arrow from 'apache-arrow';
import * as faker from 'faker';
import alasql from 'alasql/dist/alasql';
import { sqlCreate, sqlInsert } from './simple_sql';
import { SystemBenchmark, SystemBenchmarkContext, noop } from './system_benchmark';
import { shuffle } from '../utils';

export class AlasqlSimpleScanBenchmark implements SystemBenchmark {
    tuples: number;

    constructor(tuples: number) {
        this.tuples = tuples;
    }
    getName(): string {
        return `alasql_simple_scan_${this.tuples}`;
    }
    getMetadata(): any {
        return {
            system: 'alasql',
            group: 'simple_scan',
            timestamp: new Date(),
            tuples: this.tuples,
            bytes: this.tuples * 4,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const values = [];
        for (let i = 0; i < this.tuples; ++i) {
            values.push(i);
        }
        shuffle(values);
        const schema = new arrow.Schema([new arrow.Field('v', new arrow.Int32())]);
        await alasql(sqlCreate(this.getName(), schema.fields));
        for (const query of sqlInsert(this.getName(), schema.fields, [values])) {
            await alasql(query);
        }
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const rows = await alasql(`SELECT v FROM ${this.getName()}`);
        for (const row of rows) {
            noop(row);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        await alasql(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        await alasql(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
}

export class AlasqlSimpleSumBenchmark implements SystemBenchmark {
    tuples: number;

    constructor(tuples: number) {
        this.tuples = tuples;
    }
    getName(): string {
        return `alasql_simple_sum_${this.tuples}`;
    }
    getMetadata(): any {
        return {
            system: 'alasql',
            group: 'simple_sum',
            timestamp: new Date(),
            tuples: this.tuples,
            bytes: this.tuples * 4,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const values = [];
        for (let i = 0; i < this.tuples; ++i) {
            values.push(i);
        }
        shuffle(values);
        const schema = new arrow.Schema([new arrow.Field('v', new arrow.Int32())]);
        await alasql(sqlCreate(this.getName(), [new arrow.Field('v', new arrow.Int32())]));
        for (const query of sqlInsert(this.getName(), schema.fields, [values])) {
            await alasql(query);
        }
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const rows = await alasql(`SELECT sum(v) FROM ${this.getName()}`);
        for (const row of rows) {
            noop(row);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        await alasql(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        await alasql(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
}
