import * as arrow from 'apache-arrow';
import * as faker from 'faker';
import * as sqljs from 'sql.js';
import { sqlCreate, sqlInsert } from './simple_sql';
import { SystemBenchmark, SystemBenchmarkContext, noop } from './system_benchmark';
import { shuffle } from '../utils';

export class SqljsSimpleScanBenchmark implements SystemBenchmark {
    database: sqljs.Database;
    tupleCount: number;

    constructor(tupleCount: number) {
        this.database = new sqljs.Database();
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
        this.database.run(sqlCreate(this.getName(), table));
        for (const query of sqlInsert(this.getName(), table)) {
            this.database.run(query);
        }
    }
    async beforeEach(_ctx: SystemBenchmarkContext): Promise<void> {}
    async run(_ctx: SystemBenchmarkContext): Promise<void> {
        const results = this.database.exec(`SELECT v FROM ${this.getName()}`);
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

export class SqljsSimpleSumBenchmark implements SystemBenchmark {
    database: sqljs.Database;
    tupleCount: number;

    constructor(tupleCount: number) {
        this.database = new sqljs.Database();
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
        this.database.run(sqlCreate(this.getName(), table));
        for (const query of sqlInsert(this.getName(), table)) {
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
