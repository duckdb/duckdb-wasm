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
    columns: arrow.Data[];
}

const buildUtf8Array = (values: string[]) => {
    const builder = new arrow.Utf8Builder({
        type: new arrow.Utf8(),
    });
    for (const v of values) {
        builder.append(v);
    }
    builder.finish();
    return builder.flush();
};

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
        const data = arrow.makeData({
            type: new arrow.Struct(fields),
            children: columns.map(c =>
                arrow.makeData({
                    type: new arrow.Int32(),
                    data: new Int32Array(c.slice(i, i + rows)),
                }),
            ),
        });
        batches.push(new arrow.RecordBatch(schema, data));
        i += rows;
    }
    return [schema, batches];
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
                    arrow.makeData({ type: new arrow.Int32(), data: new Int32Array([1, 4, 7]) }),
                    arrow.makeData({ type: new arrow.Int32(), data: new Int32Array([2, 5, 8]) }),
                    arrow.makeData({ type: new arrow.Int32(), data: new Int32Array([3, 6, 9]) }),
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
                    arrow.makeData({ type: new arrow.Int32(), data: new Int32Array([1, 4, 7]) }),
                    arrow.makeData({ type: new arrow.Int16(), data: new Int16Array([2, 5, 8]) }),
                    buildUtf8Array(['3', '6', '9']),
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
                    arrow.makeData({ type: new arrow.Int32(), data: new Int32Array([1, 4, 7]) }),
                    arrow.makeData({ type: new arrow.Int16(), data: new Int16Array([2, 5, 8]) }),
                    buildUtf8Array(['3', '6', '9']),
                ],
            },
            {
                numRows: 2,
                columns: [
                    arrow.makeData({ type: new arrow.Int32(), data: new Int32Array([10, 13]) }),
                    arrow.makeData({ type: new arrow.Int16(), data: new Int16Array([11, 14]) }),
                    buildUtf8Array(['12', '15']),
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
                conn.query(`DROP TABLE IF EXISTS ${test.options.schema || 'main'}.${test.options.name}`);
                const batches = test.batches.map(b => {
                    const data = arrow.makeData({
                        type: new arrow.Struct(test.schema.fields),
                        children: b.columns,
                    });
                    return new arrow.RecordBatch(test.schema, data);
                });
                const table = new arrow.Table(test.schema, batches);
                conn.insertArrowTable(table, test.options);
                const results = conn.query(test.query);
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
                await conn.query(`DROP TABLE IF EXISTS ${test.options.schema || 'main'}.${test.options.name}`);
                const batches = test.batches.map(b => {
                    const data = arrow.makeData({
                        type: new arrow.Struct(test.schema.fields),
                        children: b.columns,
                    });
                    return new arrow.RecordBatch(test.schema, data);
                });
                const table = new arrow.Table(test.schema, batches);
                await conn.insertArrowTable(table, test.options);
                const results = await conn.query(test.query);
                compareTable(results, test.expectedColumns);
            });
        }
    });
    describe('Arrow async insert from table', () => {
        it('simple integers', async () => {
            await conn.query(`DROP TABLE IF EXISTS insert_from_table`);
            const table = new arrow.Table({
                a: arrow.makeVector(new Int32Array([1, 4, 7])),
                b: arrow.makeVector(new Int32Array([2, 5, 8])),
                c: arrow.vectorFromArray<arrow.Utf8>(['3', '6', '9']),
            });
            await conn.insertArrowTable(table, {
                name: 'insert_from_vectors',
            });
            const results = await conn.query('select * from insert_from_vectors');
            compareTable(results, [
                { name: 'a', values: [1, 4, 7] },
                { name: 'b', values: [2, 5, 8] },
                { name: 'c', values: ['3', '6', '9'] },
            ]);
        });
    });
}
