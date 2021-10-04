import * as arrow from 'apache-arrow';
import * as duckdb from '../src/';
import { Column, compareTable } from './table_test';

/// Unfortunately, arrow.Table.from does not build a proper Schema.
/// When it does, we might want to switch back to arrow.Table here instead
/// of arrow Schema + ArrowBatch.
interface ArrowInsertTest {
    name: string;
    schema: arrow.Schema;
    batches: ArrowBatch[];
    options: duckdb.ArrowInsertOptions;
    query: string;
    expectedColumns: Column[];
}

interface ArrowBatch {
    numRows: number;
    columns: arrow.Vector[];
}

const ARROW_INSERT_TESTS: ArrowInsertTest[] = [
    {
        name: 'integers_1',
        schema: new arrow.Schema([
            new arrow.Field('a', new arrow.Int32()),
            new arrow.Field('b', new arrow.Int32()),
            new arrow.Field('c', new arrow.Int32()),
        ]),
        batches: [
            {
                numRows: 3,
                columns: [
                    arrow.Int32Vector.from([1, 4, 7]),
                    arrow.Int32Vector.from([2, 5, 8]),
                    arrow.Int32Vector.from([3, 6, 9]),
                ],
            },
        ],
        options: {
            schema: 'main',
            name: 'foo',
        },
        query: 'SELECT * FROM main.foo',
        expectedColumns: [
            { name: 'a', values: [1, 4, 7] },
            { name: 'b', values: [2, 5, 8] },
            { name: 'c', values: [3, 6, 9] },
        ],
    },
    {
        name: 'combined_1',
        schema: new arrow.Schema([
            new arrow.Field('a', new arrow.Int32()),
            new arrow.Field('b', new arrow.Int16()),
            new arrow.Field('c', new arrow.Utf8()),
        ]),
        batches: [
            {
                numRows: 3,
                columns: [
                    arrow.Int32Vector.from([1, 4, 7]),
                    arrow.Int16Vector.from([2, 5, 8]),
                    arrow.Utf8Vector.from(['3', '6', '9']),
                ],
            },
        ],
        options: {
            schema: 'main',
            name: 'foo',
        },
        query: 'SELECT * FROM main.foo',
        expectedColumns: [
            { name: 'a', values: [1, 4, 7] },
            { name: 'b', values: [2, 5, 8] },
            { name: 'c', values: ['3', '6', '9'] },
        ],
    },
    {
        name: 'combined_2',
        schema: new arrow.Schema([
            new arrow.Field('a', new arrow.Int32()),
            new arrow.Field('b', new arrow.Int16()),
            new arrow.Field('c', new arrow.Utf8()),
        ]),
        batches: [
            {
                numRows: 3,
                columns: [
                    arrow.Int32Vector.from([1, 4, 7]),
                    arrow.Int16Vector.from([2, 5, 8]),
                    arrow.Utf8Vector.from(['3', '6', '9']),
                ],
            },
            {
                numRows: 2,
                columns: [
                    arrow.Int32Vector.from([10, 13]),
                    arrow.Int16Vector.from([11, 14]),
                    arrow.Utf8Vector.from(['12', '15']),
                ],
            },
        ],
        options: {
            schema: 'main',
            name: 'foo',
        },
        query: 'SELECT * FROM main.foo',
        expectedColumns: [
            { name: 'a', values: [1, 4, 7, 10, 13] },
            { name: 'b', values: [2, 5, 8, 11, 14] },
            { name: 'c', values: ['3', '6', '9', '12', '15'] },
        ],
    },
];

export function testArrowInsert(db: () => duckdb.DuckDBBindings): void {
    let conn: duckdb.DuckDBConnection;

    beforeEach(async () => {
        db().flushFiles();
        conn = db().connect();
    });
    afterEach(async () => {
        conn.close();
        await db().flushFiles();
        await db().dropFiles();
    });
    describe('Arrow insert from iterable', () => {
        for (const test of ARROW_INSERT_TESTS) {
            it(test.name, () => {
                conn.runQuery(`DROP TABLE IF EXISTS ${test.options.schema || 'main'}.${test.options.name}`);
                conn.insertArrowBatches(
                    test.schema,
                    test.batches.map(b => new arrow.RecordBatch(test.schema, b.numRows, b.columns)),
                    test.options,
                );
                const results = conn.runQuery(test.query);
                compareTable(results, test.expectedColumns);
            });
        }
    });
}

export function testArrowInsertAsync(db: () => duckdb.AsyncDuckDB): void {
    let conn: duckdb.AsyncDuckDBConnection;

    beforeEach(async () => {
        await db().flushFiles();
        conn = await db().connect();
    });
    afterEach(async () => {
        await conn.close();
        await db().flushFiles();
        await db().dropFiles();
    });
    describe('Arrow async insert from iterable', () => {
        for (const test of ARROW_INSERT_TESTS) {
            it(test.name, async () => {
                await conn.runQuery(`DROP TABLE IF EXISTS ${test.options.schema || 'main'}.${test.options.name}`);
                await conn.insertArrowBatches(
                    test.schema,
                    test.batches.map(b => new arrow.RecordBatch(test.schema, b.numRows, b.columns)),
                    test.options,
                );
                const results = await conn.runQuery(test.query);
                compareTable(results, test.expectedColumns);
            });
        }
    });
}
