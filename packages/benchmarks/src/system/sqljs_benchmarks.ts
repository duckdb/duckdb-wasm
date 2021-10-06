import * as arrow from 'apache-arrow';
import * as faker from 'faker';
import * as sqljs from 'sql.js';
import { sqlCreate, sqlInsert } from './simple_sql';
import { SystemBenchmark, SystemBenchmarkMetadata, SystemBenchmarkContext, noop } from './system_benchmark';
import { shuffle } from '../utils';

export class SqljsIntegerScanBenchmark implements SystemBenchmark {
    database: sqljs.Database;
    tuples: number;

    constructor(database: sqljs.Database, tuples: number) {
        this.database = database;
        this.tuples = tuples;
    }
    getName(): string {
        return `sqljs_integer_scan_${this.tuples}`;
    }
    getMetadata(): SystemBenchmarkMetadata {
        return {
            benchmark: 'integer_scan',
            system: 'sqljs',
            tags: [],
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
        this.database.run(sqlCreate(this.getName(), schema.fields));
        for (const query of sqlInsert(this.getName(), schema.fields, [values])) {
            this.database.run(query);
        }
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const results = this.database.exec(`SELECT v FROM ${this.getName()}`);
        let n = 0;
        for (const row of results[0].values) {
            noop(row);
            n += 1;
        }
        if (n !== this.tuples) {
            throw Error(`invalid tuple count. expected ${this.tuples}, received ${n}`);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database.run(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database.run(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
}

export class SqljsSimpleSumBenchmark implements SystemBenchmark {
    database: sqljs.Database;
    tuples: number;

    constructor(tuples: number) {
        this.database = new sqljs.Database();
        this.tuples = tuples;
    }
    getName(): string {
        return `sqljs_simple_sum_${this.tuples}`;
    }
    getMetadata(): any {
        return {
            system: 'sqljs',
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
        this.database.run(sqlCreate(this.getName(), schema.fields));
        for (const query of sqlInsert(this.getName(), schema.fields, [values])) {
            this.database.run(query);
        }
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(ctx: SystemBenchmarkContext): Promise<void> {
        const results = this.database.exec(`SELECT sum(v) FROM ${this.getName()}`);
        for (const row of results[0].values) {
            noop(row);
        }
    }
    async afterEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async afterAll(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database.run(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
    async onError(_ctx: SystemBenchmarkContext): Promise<void> {
        this.database.run(`DROP TABLE IF EXISTS ${this.getName()}`);
    }
}
