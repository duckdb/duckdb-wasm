import * as arrow from 'apache-arrow';
import * as aq from 'arquero';
import * as faker from 'faker';
import { SystemBenchmark, SystemBenchmarkContext, noop } from './system_benchmark';
import { shuffle } from '../utils';

export class ArqueroSimpleScanBenchmark implements SystemBenchmark {
    tuples: number;
    tables: { [key: string]: aq.internal.Table } = {};

    constructor(tuples: number) {
        this.tuples = tuples;
    }
    getName(): string {
        return `arquero_simple_scan_${this.tuples}`;
    }
    getMetadata(): any {
        return {
            system: 'arquero',
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
            values.push({
                v: i,
            });
        }
        shuffle(values);
        const schema = new arrow.Schema([new arrow.Field('v', new arrow.Int32())]);
        const batches = [];
        for (let i = 0; i < this.tuples; ) {
            const n = Math.min(1000, this.tuples - i);
            batches.push(new arrow.RecordBatch(schema, n, [arrow.Int32Vector.from(values.slice(i, i + n))]));
            i += n;
        }
        const table = new arrow.Table(schema, batches);
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
    tuples: number;
    tables: { [key: string]: aq.internal.Table } = {};

    constructor(tuples: number) {
        this.tuples = tuples;
    }
    getName(): string {
        return `arquero_simple_sum_${this.tuples}`;
    }
    getMetadata(): any {
        return {
            system: 'arquero',
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
        const batches = [];
        for (let i = 0; i < this.tuples; ) {
            const n = Math.min(1000, this.tuples - i);
            batches.push(new arrow.RecordBatch(schema, n, [arrow.Int32Vector.from(values.slice(i, i + n))]));
            i += n;
        }
        const table = new arrow.Table(schema, batches);
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
