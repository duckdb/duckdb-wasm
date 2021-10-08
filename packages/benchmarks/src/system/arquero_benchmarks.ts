import * as arrow from 'apache-arrow';
import * as aq from 'arquero';
import * as faker from 'faker';
import { SystemBenchmark, SystemBenchmarkMetadata, SystemBenchmarkContext, noop } from './system_benchmark';
import {
    generateArrow2Int32,
    generateArrowGroupedInt32,
    generateArrowInt32,
    generateArrowUtf8,
    generateArrowXInt32,
    generateCSVGroupedInt32,
    generateJSONGroupedInt32,
} from './data_generator';
import { getTPCHArrowTable } from './tpch_loader';

export class ArqueroTPCHBenchmark implements SystemBenchmark {
    tables: { [key: string]: aq.internal.Table } = {};
    scaleFactor: number;
    queryId: number;
    queryText: string | null;

    constructor(scaleFactor: number, queryId: number) {
        this.scaleFactor = scaleFactor;
        this.queryId = queryId;
        this.queryText = null;
    }
    getName(): string {
        return `arquero_tpch_${this.scaleFactor.toString().replace('.', '')}_q${this.queryId}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'tpch',
            system: 'arquero',
            tags: [],
            timestamp: new Date(),
            parameters: [this.scaleFactor, this.queryId],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        const lineitem = await getTPCHArrowTable(ctx.projectRootPath, this.scaleFactor, 'lineitem.arrow');
        const orders = await getTPCHArrowTable(ctx.projectRootPath, this.scaleFactor, 'orders.arrow');
        const customer = await getTPCHArrowTable(ctx.projectRootPath, this.scaleFactor, 'customer.arrow');
        const supplier = await getTPCHArrowTable(ctx.projectRootPath, this.scaleFactor, 'supplier.arrow');
        const region = await getTPCHArrowTable(ctx.projectRootPath, this.scaleFactor, 'region.arrow');
        const nation = await getTPCHArrowTable(ctx.projectRootPath, this.scaleFactor, 'nation.arrow');
        const partsupp = await getTPCHArrowTable(ctx.projectRootPath, this.scaleFactor, 'partsupp.arrow');
        const part = await getTPCHArrowTable(ctx.projectRootPath, this.scaleFactor, 'part.arrow');
        this.tables['lineitem'] = aq.fromArrow(lineitem);
        this.tables['orders'] = aq.fromArrow(orders);
        this.tables['customer'] = aq.fromArrow(customer);
        this.tables['supplier'] = aq.fromArrow(supplier);
        this.tables['region'] = aq.fromArrow(region);
        this.tables['nation'] = aq.fromArrow(nation);
        this.tables['partsupp'] = aq.fromArrow(partsupp);
        this.tables['part'] = aq.fromArrow(part);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        switch (this.queryId) {
            case 1: {
                const query = this.tables['lineitem']
                    .filter((d: any) => d.l_shipdate <= aq.op.timestamp('1998-09-02'))
                    .derive({
                        disc_price: (d: any) => d.l_extendedprice * (1 - d.l_discount),
                        charge: (d: any) => d.l_extendedprice * (1 - d.l_discount) * (1 + d.l_tax),
                    })
                    .groupby('l_returnflag', 'l_linestatus')
                    .rollup({
                        sum_qty: (d: any) => aq.op.sum(d.l_quantity),
                        sum_base_price: (d: any) => aq.op.sum(d.l_extendedprice),
                        sum_disc_price: (d: any) => aq.op.sum(d.disc_price),
                        sum_charge: (d: any) => aq.op.sum(d.charge),
                        avg_qty: (d: any) => aq.op.average(d.l_quantity),
                        avg_price: (d: any) => aq.op.average(d.l_extendedprice),
                        avg_disc: (d: any) => aq.op.average(d.l_discount),
                        count_order: (d: any) => aq.op.count(),
                    })
                    .orderby('l_returnflag', 'l_linestatus');
                for (const v of query.objects()) {
                    noop(v);
                }
                break;
            }
            case 3: {
                const c = this.tables['customer'].filter((d: any) => d.c_mktsegment == 'BUILDING');
                const o = this.tables['orders'].filter((d: any) => d.o_orderdate < aq.op.timestamp('1995-03-15'));
                const l = this.tables['lineitem'].filter((d: any) => d.l_shipdate < aq.op.timestamp('1995-03-15'));
                const query = c
                    .join(o, ['c_custkey', 'o_custkey'])
                    .join(l, ['o_orderkey', 'l_orderkey'])
                    .derive({
                        disc_price: (d: any) => d.l_extendedprice * (1 - d.l_discount),
                    })
                    .groupby('l_orderkey', 'o_orderdate', 'o_shippriority')
                    .rollup({
                        revenue: (d: any) => aq.op.sum(d.disc_price),
                    })
                    .orderby(aq.desc('revenue'), 'o_orderdate')
                    .objects({ limit: 10, grouped: true });
                for (const v of query) {
                    noop(v);
                }
                break;
            }
            case 4: {
                const o = this.tables['orders']
                    .filter((d: any) => d.o_orderdate >= aq.op.timestamp('1993-07-01'))
                    .filter((d: any) => d.o_orderdate < aq.op.timestamp('1993-10-01'));
                const l = this.tables['lineitem'].filter((d: any) => d.l_commitdate < d.l_receiptdate);
                const query = o
                    .join(l, ['o_orderkey', 'l_orderkey'])
                    .groupby('o_orderpriority')
                    .rollup({
                        order_count: aq.op.count(),
                    })
                    .orderby('o_orderpriority');
                for (const v of query) {
                    noop(v);
                }
                break;
            }
            case 5: {
                const r = this.tables['region'].filter((d: any) => d.r_name == 'ASIA');
                const c = this.tables['customer'];
                const l = this.tables['lineitem'];
                const s = this.tables['supplier'];
                const o = this.tables['orders']
                    .filter((d: any) => d.o_orderdate >= aq.op.timestamp('1994-01-01'))
                    .filter((d: any) => d.o_orderdate < aq.op.timestamp('1995-01-01'));
                const n = this.tables['nation'];

                const right = r
                    .join(n, ['r_regionkey', 'n_regionkey'])
                    .join(c, ['n_nationkey', 'c_nationkey'])
                    .join(o, ['c_custkey', 'o_custkey'])
                    .join(l, ['o_orderkey', 'l_orderkey']);
                const query = s
                    .join(
                        right,
                        (a: any, b: any) =>
                            aq.op.equal(a.s_nationkey, b.n_nationkey) &&
                            aq.op.equal(a.s_nationkey, b.c_nationkey) &&
                            aq.op.equal(a.s_suppkey, b.l_suppkey),
                    )
                    .derive({
                        disc_price: (d: any) => d.l_extendedprice * (1 - d.l_discount),
                    })
                    .groupby('n_name')
                    .rollup({
                        revenue: (d: any) => aq.op.sum(d.disc_price),
                    })
                    .orderby(aq.desc('revenue'));
                for (const v of query.objects()) {
                    noop(v);
                }
                break;
            }
            case 6: {
                const l = this.tables['lineitem'];
                const query = l
                    .filter((d: any) => d.l_quantity < 24)
                    .filter((d: any) => d.l_discount >= 0.05)
                    .filter((d: any) => d.l_discount <= 0.07)
                    .filter((d: any) => d.l_shipdate >= aq.op.timestamp('1994-01-01'))
                    .filter((d: any) => d.l_shipdate < aq.op.timestamp('1995-01-01'))
                    .derive({
                        realprice: (d: any) => d.l_extendedprice * d.l_discount,
                    })
                    .rollup({
                        revenue: (d: any) => aq.op.sum(d.realprice),
                    });
                for (const v of query.objects()) {
                    noop(v);
                }
                break;
            }
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        delete this.tables['lineitem'];
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        delete this.tables['lineitem'];
    }
}

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
        const [schema, batches] = generateArrowInt32(this.tuples);
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

export class ArqueroIntegerSumBenchmark implements SystemBenchmark {
    tuples: number;
    groupSize: number;
    tables: { [key: string]: aq.internal.Table } = {};

    constructor(tuples: number, groupSize: number) {
        this.tuples = tuples;
        this.groupSize = groupSize;
    }
    getName(): string {
        return `arquero_integer_sum_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_sum',
            system: 'arquero',
            tags: [],
            timestamp: new Date(),
            parameters: [this.tuples, this.groupSize],
            throughputTuples: this.tuples,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const [schema, batches] = generateArrowGroupedInt32(this.tuples, this.groupSize);
        const table = new arrow.Table(schema, batches);
        this.tables[this.getName()] = aq.fromArrow(table);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        let n = 0;
        for (const v of this.tables[this.getName()]
            .groupby('v0')
            .rollup({ sum: (d: any) => aq.op.sum(d.v1) })
            .array('sum')) {
            noop(v);
            n += 1;
        }
        const expectedGroups = this.tuples / this.groupSize;
        if (n !== expectedGroups) {
            throw Error(`invalid tuple count. expected ${expectedGroups}, received ${n}`);
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

export class ArqueroIntegerSortBenchmark implements SystemBenchmark {
    tuples: number;
    columnCount: number;
    orderBy: string[];
    tables: { [key: string]: aq.internal.Table } = {};

    constructor(tuples: number, columnCount: number, orderCriteria: number) {
        this.tuples = tuples;
        this.columnCount = columnCount;
        this.orderBy = [];
        for (let i = 0; i < orderCriteria; ++i) {
            this.orderBy.push(`v${i}`);
        }
    }
    getName(): string {
        return `arquero_integer_sort_${this.tuples}_${this.columnCount}_${this.orderBy.length}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_sort',
            system: 'arquero',
            tags: [],
            timestamp: new Date(),
            parameters: [this.tuples, this.columnCount, this.orderBy.length],
            throughputTuples: this.tuples,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const [schema, batches] = generateArrowXInt32(this.tuples, this.columnCount);
        const table = new arrow.Table(schema, batches);
        this.tables[this.getName()] = aq.fromArrow(table);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        let n = 0;
        for (const v of this.tables[this.getName()].orderby(this.orderBy).array('v0')) {
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

export class ArqueroIntegerTopKBenchmark implements SystemBenchmark {
    tuples: number;
    columnCount: number;
    orderBy: string[];
    k: number;
    tables: { [key: string]: aq.internal.Table } = {};

    constructor(tuples: number, columnCount: number, orderCriteria: number, k: number) {
        this.tuples = tuples;
        this.columnCount = columnCount;
        this.orderBy = [];
        this.k = k;
        for (let i = 0; i < orderCriteria; ++i) {
            this.orderBy.push(`v${i}`);
        }
    }
    getName(): string {
        return `arquero_integer_topk_${this.tuples}_${this.columnCount}_${this.orderBy.length}_${this.k}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_topk',
            system: 'arquero',
            tags: [],
            timestamp: new Date(),
            parameters: [this.tuples, this.columnCount, this.orderBy.length],
            throughputTuples: this.tuples,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const [schema, batches] = generateArrowXInt32(this.tuples, this.columnCount);
        const table = new arrow.Table(schema, batches);
        this.tables[this.getName()] = aq.fromArrow(table);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        let n = 0;
        for (const v of this.tables[this.getName()].orderby(this.orderBy).array('v0')) {
            noop(v);
            n += 1;
            if (n >= this.k) {
                break;
            }
        }
        if (n !== this.k) {
            throw Error(`invalid tuple count. expected ${this.k}, received ${n}`);
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

export class ArqueroCSVSumBenchmark implements SystemBenchmark {
    tuples: number;
    groupSize: number;
    csvBuffer: string | null;

    constructor(tuples: number, groupSize: number) {
        this.tuples = tuples;
        this.groupSize = groupSize;
        this.csvBuffer = null;
    }
    getName(): string {
        return `arquero_csv_sum_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'csv_sum',
            system: 'arquero',
            tags: [],
            timestamp: new Date(),
            parameters: [this.tuples, this.groupSize],
            throughputTuples: this.tuples,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        this.csvBuffer = generateCSVGroupedInt32(this.tuples, this.groupSize);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const table = aq.fromCSV(this.csvBuffer!, {
            header: false,
            names: ['v0', 'v1'],
            delimiter: '|',
        });
        let n = 0;
        for (const v of table
            .groupby('v0')
            .rollup({ sum: (d: any) => aq.op.sum(d.v1) })
            .array('sum')) {
            noop(v);
            n += 1;
        }
        const expectedGroups = this.tuples / this.groupSize;
        if (n !== expectedGroups) {
            throw Error(`invalid tuple count. expected ${expectedGroups}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {}
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {}
}

export class ArqueroJSONSumBenchmark implements SystemBenchmark {
    tuples: number;
    groupSize: number;
    jsonBuffer: string | null;

    constructor(tuples: number, groupSize: number) {
        this.tuples = tuples;
        this.groupSize = groupSize;
        this.jsonBuffer = null;
    }
    getName(): string {
        return `arquero_json_sum_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'json_sum',
            system: 'arquero',
            tags: [],
            timestamp: new Date(),
            parameters: [this.tuples, this.groupSize],
            throughputTuples: this.tuples,
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        this.jsonBuffer = generateJSONGroupedInt32(this.tuples, this.groupSize);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const table = aq.fromJSON(this.jsonBuffer!);
        let n = 0;
        for (const v of table
            .groupby('v0')
            .rollup({ sum: (d: any) => aq.op.sum(d.v1) })
            .array('sum')) {
            noop(v);
            n += 1;
        }
        const expectedGroups = this.tuples / this.groupSize;
        if (n !== expectedGroups) {
            throw Error(`invalid tuple count. expected ${expectedGroups}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {}
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {}
}

export class ArqueroIntegerJoin2Benchmark implements SystemBenchmark {
    tuplesA: number;
    tuplesB: number;
    filterA: number;
    stepAB: number;
    tables: { [key: string]: aq.internal.Table } = {};

    constructor(a: number, b: number, filterA: number, stepAB: number) {
        this.tuplesA = a;
        this.tuplesB = b;
        this.filterA = filterA;
        this.stepAB = stepAB;
    }
    getName(): string {
        return `arquero_integer_join2_${this.tuplesA}_${this.tuplesB}_${this.filterA}_${this.stepAB}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_join2',
            system: 'arquero',
            tags: [],
            timestamp: new Date(),
            parameters: [this.tuplesA, this.tuplesB, this.stepAB, this.filterA],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const [schemaA, batchesA] = generateArrowInt32(this.tuplesA);
        const [schemaB, batchesB] = generateArrow2Int32(this.tuplesB, this.stepAB);
        const tableA = new arrow.Table(schemaA, batchesA);
        const tableB = new arrow.Table(schemaB, batchesB);
        this.tables['A'] = aq.fromArrow(tableA);
        this.tables['B'] = aq.fromArrow(tableB);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const filter = this.filterA;
        const result = this.tables['A']
            .params({ filter })
            .filter((row: any) => row.v0 < filter)
            .rename({ v0: 'a0' })
            .join(this.tables['B'].rename({ v0: 'b0', v1: 'b1' }), ['a0', 'b1']);
        let n = 0;
        for (const v of result) {
            noop(v);
            n += 1;
        }
        const expected = this.filterA * this.stepAB;
        if (n !== expected) {
            throw Error(`invalid tuple count. expected ${expected}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        delete this.tables['A'];
        delete this.tables['B'];
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        delete this.tables['A'];
        delete this.tables['B'];
    }
}

export class ArqueroIntegerJoin3Benchmark implements SystemBenchmark {
    tuplesA: number;
    tuplesB: number;
    tuplesC: number;
    stepAB: number;
    stepBC: number;
    filterA: number;
    tables: { [key: string]: aq.internal.Table } = {};

    constructor(a: number, b: number, c: number, filterA: number, stepAB: number, stepBC: number) {
        this.tuplesA = a;
        this.tuplesB = b;
        this.tuplesC = c;
        this.stepAB = stepAB;
        this.stepBC = stepBC;
        this.filterA = filterA;
    }
    getName(): string {
        return `arquero_integer_join3_${this.tuplesA}_${this.tuplesB}_${this.tuplesC}_${this.filterA}_${this.stepAB}_${this.stepBC}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_join3',
            system: 'arquero',
            tags: [],
            timestamp: new Date(),
            parameters: [this.tuplesA, this.tuplesB, this.tuplesC, this.stepAB, this.stepBC, this.filterA],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const [schemaA, batchesA] = generateArrowInt32(this.tuplesA);
        const [schemaB, batchesB] = generateArrow2Int32(this.tuplesB, this.stepAB);
        const [schemaC, batchesC] = generateArrow2Int32(this.tuplesC, this.stepBC);
        const tableA = new arrow.Table(schemaA, batchesA);
        const tableB = new arrow.Table(schemaB, batchesB);
        const tableC = new arrow.Table(schemaC, batchesC);
        this.tables['A'] = aq.fromArrow(tableA);
        this.tables['B'] = aq.fromArrow(tableB);
        this.tables['C'] = aq.fromArrow(tableC);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const filter = this.filterA;
        const result = this.tables['A']
            .params({ filter })
            .filter((row: any) => row.v0 < filter)
            .rename({ v0: 'a0' })
            .join(this.tables['B'].rename({ v0: 'b0', v1: 'b1' }), ['a0', 'b1'])
            .join(this.tables['C'].rename({ v0: 'c0', v1: 'c1' }), ['b0', 'c1']);
        let n = 0;
        for (const v of result) {
            noop(v);
            n += 1;
        }
        const expected = this.filterA * this.stepAB * this.stepBC;
        if (n !== expected) {
            throw Error(`invalid tuple count. expected ${expected}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        delete this.tables['A'];
        delete this.tables['B'];
        delete this.tables['C'];
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        delete this.tables['A'];
        delete this.tables['B'];
        delete this.tables['C'];
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
        const [schema, batches] = generateArrowUtf8(this.tuples, this.chars);
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

export class ArqueroRegexBenchmark implements SystemBenchmark {
    tuples: number;
    tables: { [key: string]: aq.internal.Table } = {};
    chars: number;

    constructor(tuples: number, chars: number) {
        this.tuples = tuples;
        this.chars = chars;
    }
    getName(): string {
        return `arquero_regex_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'regex',
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
        const [schema, batches] = generateArrowUtf8(this.tuples, this.chars);
        const table = new arrow.Table(schema, batches);
        this.tables[this.getName()] = aq.fromArrow(table);
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        let n = 0;
        for (const v of this.tables[this.getName()].filter((d: any) => aq.op.match(d.v0, /^.#+$/g, null)).array('v0')) {
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
