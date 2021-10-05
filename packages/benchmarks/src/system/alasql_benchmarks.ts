import * as arrow from 'apache-arrow';
import * as faker from 'faker';
import alasql from 'alasql';
import { sqlCreate, sqlInsert } from './simple_sql';
import { SystemBenchmark, SystemBenchmarkContext, noop } from './system_benchmark';
import { shuffle } from '../utils';

export class AlasqlSimpleScanBenchmark implements SystemBenchmark {
    tupleCount: number;

    constructor(tupleCount: number) {
        this.tupleCount = tupleCount;
    }
    getName(): string {
        return `scan_benchmark_${this.tupleCount}`;
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const values = [];
        for (let i = 0; i < this.tupleCount; ++i) {
            values.push(i);
        }
        shuffle(values);
        const table = arrow.Table.from({
            v: arrow.Int32Vector.from(values),
        });
        alasql(sqlCreate(this.getName(), table));
        for (const query of sqlInsert(this.getName(), table)) {
            alasql(query);
        }
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const rows = alasql(`SELECT v FROM ${this.getName()}`);
        for (const row of rows) {
            noop(row);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        alasql(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        alasql(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
}

export class AlasqlSimpleSumBenchmark implements SystemBenchmark {
    tupleCount: number;

    constructor(tupleCount: number) {
        this.tupleCount = tupleCount;
    }
    getName(): string {
        return `sum_benchmark_${this.tupleCount}`;
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const values = [];
        for (let i = 0; i < this.tupleCount; ++i) {
            values.push(i);
        }
        shuffle(values);
        const table = arrow.Table.from({
            v: arrow.Int32Vector.from(values),
        });
        alasql(sqlCreate(this.getName(), table));
        for (const query of sqlInsert(this.getName(), table)) {
            alasql(query);
        }
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const rows = alasql(`SELECT sum(v) FROM ${this.getName()}`);
        for (const row of rows) {
            noop(row);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        alasql(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        alasql(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
}
