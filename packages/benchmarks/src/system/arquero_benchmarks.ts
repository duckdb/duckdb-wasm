import * as arrow from 'apache-arrow';
import * as aq from 'arquero';
import * as faker from 'faker';
import { SystemBenchmark, SystemBenchmarkContext, noop } from './system_benchmark';
import { shuffle } from '../utils';

export class ArqueroSimpleScanBenchmark implements SystemBenchmark {
    tupleCount: number;
    tables: { [key: string]: aq.internal.Table } = {};

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
        this.tables[this.getName()] = aq.fromArrow(table);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        for (const row of this.tables[this.getName()].objects()) {
            noop(row.a);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        delete this.tables[this.getName()];
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        delete this.tables[this.getName()];
    }
}

export class ArqueroSimpleSumBenchmark implements SystemBenchmark {
    tupleCount: number;
    tables: { [key: string]: aq.internal.Table } = {};

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
        this.tables[this.getName()] = aq.fromArrow(table);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const rows = this.tables[this.getName()].rollup({ sum_v: `aq.op.sum(d['a'])` }).objects();
        return rows[0].sum_v;
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        delete this.tables[this.getName()];
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        delete this.tables[this.getName()];
    }
}
