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

export function generateXInt32(n: number, cols: number): number[][] {
    const columns = [];
    for (let j = 0; j < cols; ++j) {
        const column = [];
        for (let i = 0; i < n; ++i) {
            column.push(i);
        }
        columns.push(column);
    }
    return columns;
}

export function generateArrowXInt32(n: number, cols: number): [arrow.Schema, arrow.RecordBatch[]] {
    const columns = generateXInt32(n, cols);
    const fields = [];
    for (let j = 0; j < cols; ++j) {
        fields.push(new arrow.Field(`v${j}`, new arrow.Int32()));
    }
    const schema = new arrow.Schema(fields);
    const batches = [];
    for (let i = 0; i < n; ) {
        const rows = Math.min(1000, n - i);
        batches.push(
            new arrow.RecordBatch(
                schema,
                rows,
                columns.map(c => arrow.Int32Vector.from(c.slice(i, i + n))),
            ),
        );
        i += rows;
    }
    return [schema, batches];
}

const ARROW_INSERT_TESTS: ArrowInsertTest[] = [
    {
        name: 'integers_1',
        schema: arrow.Schema.new({
            a: new arrow.Int32(),
            b: new arrow.Int32(),
            c: new arrow.Int32(),
        }),
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
        schema: arrow.Schema.new({
            a: new arrow.Int32(),
            b: new arrow.Int16(),
            c: new arrow.Utf8(),
        }),
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
        schema: arrow.Schema.new({
            a: new arrow.Int32(),
            b: new arrow.Int16(),
            c: new arrow.Utf8(),
        }),
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
    describe('Arrow insert from vectors', () => {
        it('simple integers', () => {
            conn.runQuery(`DROP TABLE IF EXISTS insert_from_vectors`);
            conn.insertArrowVectors(
                {
                    a: arrow.Int32Vector.from([1, 4, 7]),
                    b: arrow.Int32Vector.from([2, 5, 8]),
                    c: arrow.Utf8Vector.from(['3', '6', '9']),
                },
                {
                    name: 'insert_from_vectors',
                },
            );
            const results = conn.runQuery('select * from insert_from_vectors');
            compareTable(results, [
                { name: 'a', values: [1, 4, 7] },
                { name: 'b', values: [2, 5, 8] },
                { name: 'c', values: ['3', '6', '9'] },
            ]);
            conn.runQuery(`DROP TABLE IF EXISTS insert_from_vectors`);
        });
    });
    describe('Arrow benchmark inserts', () => {
        it('generated integer batches', () => {
            conn.runQuery(`DROP TABLE IF EXISTS insert_generated_batches`);
            const [schema, batches] = generateArrowXInt32(10000, 2);
            conn.insertArrowBatches(schema, batches, {
                schema: 'main',
                name: 'insert_generated_batches',
            });
            conn.runQuery(`DROP TABLE IF EXISTS insert_generated_batches`);
        });
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
    describe('Arrow insert from iterable', () => {
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
    describe('Arrow insert from vectors', () => {
        it('simple integers', async () => {
            await conn.runQuery(`DROP TABLE IF EXISTS insert_from_vectors`);
            await conn.insertArrowVectors(
                {
                    a: arrow.Int32Vector.from([1, 4, 7]),
                    b: arrow.Int32Vector.from([2, 5, 8]),
                    c: arrow.Utf8Vector.from(['3', '6', '9']),
                },
                {
                    name: 'insert_from_vectors',
                },
            );
            const results = await conn.runQuery('select * from insert_from_vectors');
            compareTable(results, [
                { name: 'a', values: [1, 4, 7] },
                { name: 'b', values: [2, 5, 8] },
                { name: 'c', values: ['3', '6', '9'] },
            ]);
        });
    });
}
