import * as arrow from 'apache-arrow';
import * as aq from 'arquero';
import * as faker from 'faker';
import { SystemBenchmark, SystemBenchmarkMetadata, SystemBenchmarkContext, noop } from './system_benchmark';
import { generateArrowInt32Table, generateArrowUtf8Table } from './data_generator';

export class ArqueroIntegerScanBenchmark implements SystemBenchmark {
    tuples: number;
    tables: { [key: string]: aq.internal.Table } = {};

    constructor(tuples: number) {
        this.tuples = tuples;
    }
    getName(): string {
        return `arquero_integer_scan_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_scan',
            system: 'arquero',
            tags: [],
            timestamp: new Date(),
            tuples: this.tuples,
            bytes: this.tuples * 4,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const [schema, batches] = generateArrowInt32Table(this.tuples);
        const table = new arrow.Table(schema, batches);
        this.tables[this.getName()] = aq.fromArrow(table);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        let n = 0;
        for (const v of this.tables[this.getName()].array('v')) {
            noop(v);
            n += 1;
        }
        if (n !== this.tuples) {
            throw Error(`invalid tuple count. expected ${this.tuples}, received ${n}`);
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

export class ArqueroVarcharScanBenchmark implements SystemBenchmark {
    tuples: number;
    tables: { [key: string]: aq.internal.Table } = {};
    chars: number;

    constructor(tuples: number, chars: number) {
        this.tuples = tuples;
        this.chars = chars;
    }
    getName(): string {
        return `arquero_varchar_scan_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'varchar_scan',
            system: 'arquero',
            tags: [],
            timestamp: new Date(),
            tuples: this.tuples,
            bytes: this.tuples * 4,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const [schema, batches] = generateArrowUtf8Table(this.tuples, this.chars);
        const table = new arrow.Table(schema, batches);
        this.tables[this.getName()] = aq.fromArrow(table);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        let n = 0;
        for (const v of this.tables[this.getName()].array('v')) {
            noop(v);
            n += 1;
        }
        if (n !== this.tuples) {
            throw Error(`invalid tuple count. expected ${this.tuples}, received ${n}`);
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

export class ArqueroVarcharFilterBenchmark implements SystemBenchmark {
    tuples: number;
    tables: { [key: string]: aq.internal.Table } = {};
    chars: number;

    constructor(tuples: number, chars: number) {
        this.tuples = tuples;
        this.chars = chars;
    }
    getName(): string {
        return `arquero_varchar_filter_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'varchar_filter',
            system: 'arquero',
            tags: [],
            timestamp: new Date(),
            tuples: this.tuples,
            bytes: this.tuples * 4,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const [schema, batches] = generateArrowUtf8Table(this.tuples, this.chars);
        const table = new arrow.Table(schema, batches);
        this.tables[this.getName()] = aq.fromArrow(table);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        let n = 0;
        for (const v of this.tables[this.getName()].filter((d: any) => aq.op.match(d.v, /^.#+$/g, null)).array('v')) {
            noop(v);
            n += 1;
        }
        if (n !== 10) {
            throw Error(`invalid tuple count. expected 10, received ${n}`);
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
