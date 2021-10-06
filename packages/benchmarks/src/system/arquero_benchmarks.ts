import * as arrow from 'apache-arrow';
import * as aq from 'arquero';
import * as faker from 'faker';
import { SystemBenchmark, SystemBenchmarkMetadata, SystemBenchmarkContext, noop } from './system_benchmark';
import { generateArrow2Int32Table, generateArrowInt32Table, generateArrowUtf8Table } from './data_generator';

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
            parameters: [this.tuples],
            throughputTuples: this.tuples,
            throughputBytes: this.tuples * 4,
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
        for (const v of this.tables[this.getName()].array('v0')) {
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

export class ArqueroIntegerJoinBenchmark implements SystemBenchmark {
    tuplesLeft: number;
    tuplesRight: number;
    stepLR: number;
    filterLeft: number;
    tables: { [key: string]: aq.internal.Table } = {};

    constructor(l: number, r: number, stepLR: number, filterLeft: number) {
        this.tuplesLeft = l;
        this.tuplesRight = r;
        this.stepLR = stepLR;
        this.filterLeft = filterLeft;
    }
    getName(): string {
        return `arquero_integer_join_${this.tuplesLeft}_${this.tuplesRight}_${this.stepLR}_${this.filterLeft}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_join',
            system: 'arquero',
            tags: [],
            timestamp: new Date(),
            parameters: [this.tuplesLeft, this.tuplesRight, this.stepLR, this.filterLeft],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const [schemaL, batchesL] = generateArrowInt32Table(this.tuplesLeft);
        const [schemaR, batchesR] = generateArrow2Int32Table(this.tuplesRight, this.stepLR);
        const tableL = new arrow.Table(schemaL, batchesL);
        const tableR = new arrow.Table(schemaR, batchesR);
        this.tables['L'] = aq.fromArrow(tableL);
        this.tables['R'] = aq.fromArrow(tableR);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const filter = this.filterLeft;
        const result = this.tables['L']
            .params({ filter })
            .filter((row: any) => row.v0 < filter)
            .join(this.tables['R'], ['v0', 'v1']);
        for (const v of result) {
            noop(v);
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
            parameters: [this.tuples],
            throughputTuples: this.tuples,
            throughputBytes: this.tuples * this.chars,
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
        for (const v of this.tables[this.getName()].array('v0')) {
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
            parameters: [this.tuples],
            throughputTuples: this.tuples,
            throughputBytes: this.tuples * this.chars,
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
        for (const v of this.tables[this.getName()].filter((d: any) => aq.op.match(d.v, /^.#+$/g, null)).array('v0')) {
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
