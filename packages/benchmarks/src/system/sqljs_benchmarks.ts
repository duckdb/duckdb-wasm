import * as arrow from 'apache-arrow';
import * as faker from 'faker';
import * as sqljs from 'sql.js';
import { sqlCreate, sqlInsert } from './simple_sql';
import { SystemBenchmark, SystemBenchmarkMetadata, SystemBenchmarkContext, noop } from './system_benchmark';
import { getTPCHQuery, getTPCHSQLiteDB } from './tpch_loader';
import { generate2Int32, generateGroupedInt32, generateInt32, generateUtf8, generateXInt32 } from './data_generator';

let DATABASE: sqljs.Database | null = null;

export class SqljsTPCHBenchmark implements SystemBenchmark {
    scaleFactor: number;
    query: number;
    queryText: string | null;

    constructor(scaleFactor: number, query: number) {
        this.scaleFactor = scaleFactor;
        this.query = query;
        this.queryText = null;
    }
    getName(): string {
        return `sqljs_tpch_${this.scaleFactor.toString().replace('.', '')}_q${this.query}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'tpch',
            system: 'sqljs',
            tags: [],
            timestamp: +new Date(),
            parameters: [this.scaleFactor, this.query],
        };
    }
    static async beforeGroup(
        initDB: sqljs.SqlJsStatic,
        ctx: SystemBenchmarkContext,
        scaleFactor: number,
    ): Promise<void> {
        const buffer = await getTPCHSQLiteDB(ctx.projectRootPath, scaleFactor);
        DATABASE = new initDB.Database(buffer);
    }
    static async afterGroup(): Promise<void> {
        DATABASE!.run('DROP TABLE IF EXISTS lineitem');
        DATABASE!.run('DROP TABLE IF EXISTS customer');
        DATABASE!.run('DROP TABLE IF EXISTS orders');
        DATABASE!.run('DROP TABLE IF EXISTS region');
        DATABASE!.run('DROP TABLE IF EXISTS nation');
        DATABASE!.run('DROP TABLE IF EXISTS supplier');
        DATABASE!.run('DROP TABLE IF EXISTS part');
        DATABASE!.run('DROP TABLE IF EXISTS partsupp');
    }

    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        switch (this.query) {
            case 7:
            case 8:
            case 9:
            case 22:
                this.queryText = await getTPCHQuery(ctx.projectRootPath, `${this.query}-sqlite.sql`);
                break;
            default:
                this.queryText = await getTPCHQuery(ctx.projectRootPath, `${this.query}.sql`);
                break;
        }
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        DATABASE!.run(this.queryText!);
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {}
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {}
}

export class SqljsRegexBenchmark implements SystemBenchmark {
    initDB: sqljs.SqlJsStatic;
    database: sqljs.Database | null;
    tuples: number;
    chars: number;

    constructor(initDB: sqljs.SqlJsStatic, tuples: number, chars: number) {
        this.initDB = initDB;
        this.database = null;
        this.tuples = tuples;
        this.chars = chars;
    }
    getName(): string {
        return `sqljs_regex_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'regex',
            system: 'sqljs',
            tags: [],
            timestamp: +new Date(),
            parameters: [this.tuples, this.chars],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const values = generateUtf8(this.tuples, this.chars);
        this.database = new this.initDB.Database();
        const schema = new arrow.Schema([new arrow.Field('v0', new arrow.Utf8())]);
        this.database.run(sqlCreate(this.getName(), schema.fields));
        for (const query of sqlInsert(this.getName(), schema.fields, [values])) {
            this.database.run(query);
        }
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const results = this.database!.exec(`SELECT * FROM ${this.getName()} WHERE v0 LIKE '_#%'`);
        let n = 0;
        for (const row of results[0].values) {
            noop(row);
            n += 1;
        }
        if (n !== 10) {
            throw Error(`invalid tuple count. expected 10, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database!.run(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database!.run(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
}

export class SqljsIntegerSumBenchmark implements SystemBenchmark {
    initDB: sqljs.SqlJsStatic;
    database: sqljs.Database | null;
    tuples: number;
    groupSize: number;

    constructor(initDB: sqljs.SqlJsStatic, tuples: number, groupSize: number) {
        this.initDB = initDB;
        this.database = null;
        this.tuples = tuples;
        this.groupSize = groupSize;
    }
    getName(): string {
        return `sqljs_integer_sum_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_sum',
            system: 'sqljs',
            tags: [],
            timestamp: +new Date(),
            parameters: [this.tuples, this.groupSize],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const [values0, values1] = generateGroupedInt32(this.tuples, this.groupSize);
        this.database = new this.initDB.Database();
        const schema = new arrow.Schema([
            new arrow.Field('v0', new arrow.Int32()),
            new arrow.Field('v1', new arrow.Int32()),
        ]);
        this.database.run(sqlCreate(this.getName(), schema.fields));
        for (const query of sqlInsert(this.getName(), schema.fields, [values0, values1])) {
            this.database.run(query);
        }
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const results = this.database!.exec(`SELECT SUM(v1) FROM ${this.getName()} GROUP BY v0`);
        let n = 0;
        for (const row of results[0].values) {
            noop(row);
            n += 1;
        }
        const expectedGroups = this.tuples / this.groupSize;
        if (n !== expectedGroups) {
            throw Error(`invalid tuple count. expected ${expectedGroups}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database!.run(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database!.run(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
}

export class SqljsIntegerSortBenchmark implements SystemBenchmark {
    initDB: sqljs.SqlJsStatic;
    database: sqljs.Database | null;
    tuples: number;
    columnCount: number;
    orderBy: string[];

    constructor(initDB: sqljs.SqlJsStatic, tuples: number, columnCount: number, orderCriteria: number) {
        this.initDB = initDB;
        this.database = null;
        this.columnCount = columnCount;
        this.tuples = tuples;
        this.orderBy = [];
        for (let i = 0; i < orderCriteria; ++i) {
            this.orderBy.push(`v${i}`);
        }
    }
    getName(): string {
        return `sqljs_integer_sort_${this.tuples}_${this.columnCount}_${this.orderBy.length}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_sort',
            system: 'sqljs',
            tags: [],
            timestamp: +new Date(),
            parameters: [this.tuples, this.columnCount, this.orderBy.length],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const columns = generateXInt32(this.tuples, this.columnCount);
        this.database = new this.initDB.Database();
        const fields = columns.map((_c, i) => new arrow.Field(`v${i}`, new arrow.Int32()));
        this.database.run(sqlCreate(this.getName(), fields));
        for (const query of sqlInsert(this.getName(), fields, columns)) {
            this.database.run(query);
        }
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const results = this.database!.exec(`SELECT * FROM ${this.getName()} ORDER BY ${this.orderBy.join(',')}`);
        let n = 0;
        for (const row of results[0].values) {
            noop(row);
            n += 1;
        }
        if (this.tuples !== n) {
            throw Error(`invalid tuple count. expected ${this.tuples}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database!.run(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database!.run(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
}

export class SqljsIntegerTopKBenchmark implements SystemBenchmark {
    initDB: sqljs.SqlJsStatic;
    database: sqljs.Database | null;
    tuples: number;
    columnCount: number;
    orderBy: string[];
    k: number;

    constructor(initDB: sqljs.SqlJsStatic, tuples: number, columnCount: number, orderCriteria: number, k: number) {
        this.initDB = initDB;
        this.database = null;
        this.columnCount = columnCount;
        this.tuples = tuples;
        this.orderBy = [];
        this.k = k;
        for (let i = 0; i < orderCriteria; ++i) {
            this.orderBy.push(`v${i}`);
        }
    }
    getName(): string {
        return `sqljs_integer_topk_${this.tuples}_${this.columnCount}_${this.orderBy.length}_${this.k}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_topk',
            system: 'sqljs',
            tags: [],
            timestamp: +new Date(),
            parameters: [this.tuples, this.columnCount, this.orderBy.length, this.k],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const columns = generateXInt32(this.tuples, this.columnCount);
        this.database = new this.initDB.Database();
        const fields = columns.map((_c, i) => new arrow.Field(`v${i}`, new arrow.Int32()));
        this.database.run(sqlCreate(this.getName(), fields));
        for (const query of sqlInsert(this.getName(), fields, columns)) {
            this.database.run(query);
        }
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const results = this.database!.exec(
            `SELECT * FROM ${this.getName()} ORDER BY (${this.orderBy.join(',')}) LIMIT ${this.k}`,
        );
        let n = 0;
        for (const row of results[0].values) {
            noop(row);
            n += 1;
        }
        if (n !== this.k) {
            throw Error(`invalid tuple count. expected ${this.k}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database!.run(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database!.run(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
}

export class SqljsIntegerJoin2Benchmark implements SystemBenchmark {
    initDB: sqljs.SqlJsStatic;
    database: sqljs.Database | null;
    tuplesA: number;
    tuplesB: number;
    stepAB: number;
    filterA: number;

    constructor(initDB: sqljs.SqlJsStatic, a: number, b: number, filterA: number, stepAB: number) {
        this.initDB = initDB;
        this.database = null;
        this.tuplesA = a;
        this.tuplesB = b;
        this.filterA = filterA;
        this.stepAB = stepAB;
    }
    getName(): string {
        return `sqljs_integer_join2_${this.tuplesA}_${this.tuplesB}_${this.stepAB}_${this.filterA}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_join2',
            system: 'sqljs',
            tags: [],
            timestamp: +new Date(),
            parameters: [this.tuplesA, this.tuplesB, this.stepAB, this.filterA],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        const valuesA = generateInt32(this.tuplesA);
        const [valuesB0, valuesB1] = generate2Int32(this.tuplesB, this.stepAB);
        this.database = new this.initDB.Database();
        const fieldsA = [new arrow.Field('v0', new arrow.Int32())];
        const fieldsB = [new arrow.Field('v0', new arrow.Int32()), new arrow.Field('v1', new arrow.Int32())];
        this.database.run(sqlCreate(`${this.getName()}_a`, fieldsA));
        this.database.run(sqlCreate(`${this.getName()}_b`, fieldsB));
        for (const query of sqlInsert(`${this.getName()}_a`, fieldsA, [valuesA])) {
            this.database.run(query);
        }
        for (const query of sqlInsert(`${this.getName()}_b`, fieldsB, [valuesB0, valuesB1])) {
            this.database.run(query);
        }
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const results = this.database!.exec(`
            SELECT *
            FROM ${this.getName()}_a a, ${this.getName()}_b b
            WHERE a.v0 = b.v1
            AND a.v0 < ${this.filterA}
        `);
        let n = 0;
        for (const row of results[0].values) {
            noop(row);
            n += 1;
        }
        const expected = this.filterA * this.stepAB;
        if (n !== expected) {
            throw Error(`invalid tuple count. expected ${expected}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database!.run(`DROP TABLE IF EXISTS ${this.getName()}_a`);
        this.database!.run(`DROP TABLE IF EXISTS ${this.getName()}_b`);
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database!.run(`DROP TABLE IF EXISTS ${this.getName()}_a`);
        this.database!.run(`DROP TABLE IF EXISTS ${this.getName()}_b`);
    }
}

export class SqljsIntegerJoin3Benchmark implements SystemBenchmark {
    initDB: sqljs.SqlJsStatic;
    database: sqljs.Database | null;
    tuplesA: number;
    tuplesB: number;
    tuplesC: number;
    stepAB: number;
    stepBC: number;
    filterA: number;

    constructor(
        initDB: sqljs.SqlJsStatic,
        a: number,
        b: number,
        c: number,
        filterA: number,
        stepAB: number,
        stepBC: number,
    ) {
        this.initDB = initDB;
        this.database = null;
        this.tuplesA = a;
        this.tuplesB = b;
        this.tuplesC = c;
        this.stepAB = stepAB;
        this.stepBC = stepBC;
        this.filterA = filterA;
    }
    getName(): string {
        return `sqljs_integer_join3_${this.tuplesA}_${this.tuplesB}_${this.tuplesC}_${this.filterA}_${this.stepAB}_${this.stepBC}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_join3',
            system: 'sqljs',
            tags: [],
            timestamp: +new Date(),
            parameters: [this.tuplesA, this.tuplesB, this.tuplesC, this.stepAB, this.stepBC, this.filterA],
        };
    }
    async beforeAll(ctx: SystemBenchmarkContext): Promise<void> {
        faker.seed(ctx.seed);
        faker.seed(ctx.seed);
        const valuesA = generateInt32(this.tuplesA);
        const [valuesB0, valuesB1] = generate2Int32(this.tuplesB, this.stepAB);
        const [valuesC0, valuesC1] = generate2Int32(this.tuplesC, this.stepBC);
        this.database = new this.initDB.Database();
        const fieldsA = [new arrow.Field('v0', new arrow.Int32())];
        const fieldsB = [new arrow.Field('v0', new arrow.Int32()), new arrow.Field('v1', new arrow.Int32())];
        const fieldsC = [new arrow.Field('v0', new arrow.Int32()), new arrow.Field('v1', new arrow.Int32())];
        this.database.run(sqlCreate(`${this.getName()}_a`, fieldsA));
        this.database.run(sqlCreate(`${this.getName()}_b`, fieldsB));
        this.database.run(sqlCreate(`${this.getName()}_c`, fieldsC));
        for (const query of sqlInsert(`${this.getName()}_a`, fieldsA, [valuesA])) {
            this.database.run(query);
        }
        for (const query of sqlInsert(`${this.getName()}_b`, fieldsB, [valuesB0, valuesB1])) {
            this.database.run(query);
        }
        for (const query of sqlInsert(`${this.getName()}_c`, fieldsC, [valuesC0, valuesC1])) {
            this.database.run(query);
        }
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const results = this.database!.exec(`
            SELECT *
            FROM ${this.getName()}_a a, ${this.getName()}_b b, ${this.getName()}_c c
            WHERE a.v0 = b.v1
            AND b.v0 = c.v1
            AND a.v0 < ${this.filterA}
        `);
        let n = 0;
        for (const row of results[0].values) {
            noop(row);
            n += 1;
        }
        const expected = this.filterA * this.stepAB * this.stepBC;
        if (n !== expected) {
            throw Error(`invalid tuple count. expected ${expected}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database!.run(`DROP TABLE IF EXISTS ${this.getName()}_a`);
        this.database!.run(`DROP TABLE IF EXISTS ${this.getName()}_b`);
        this.database!.run(`DROP TABLE IF EXISTS ${this.getName()}_c`);
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database!.run(`DROP TABLE IF EXISTS ${this.getName()}_a`);
        this.database!.run(`DROP TABLE IF EXISTS ${this.getName()}_b`);
        this.database!.run(`DROP TABLE IF EXISTS ${this.getName()}_c`);
    }
}
