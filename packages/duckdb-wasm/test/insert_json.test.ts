import * as arrow from 'apache-arrow';
import * as duckdb from '../src/';
import { Column, compareTable } from './table_test';

function itBrowser(expectation: string, assertion?: jasmine.ImplementationCallback, timeout?: number): void {
    if (typeof window !== 'undefined') {
        it(expectation, assertion, timeout);
    }
}

const encoder = new TextEncoder();

interface JSONInsertTest {
    name: string;
    input: string;
    options: duckdb.JSONInsertOptions;
    query: string;
    expectedColumns: Column[];
}

const JSON_INSERT_TESTS: JSONInsertTest[] = [
    {
        name: 'rows_integers',
        input: `[
            {"a":1, "b":2, "c":3},
            {"a":4, "b":5, "c":6},
            {"a":7, "b":8, "c":9},
        ]`,
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
        name: 'cols_integers',
        input: `{
            "a": [1, 4, 7],
            "b": [2, 5, 8],
            "c": [3, 6, 9]
        }`,
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
        name: 'options_1',
        input: `[
            {"a":1, "b":2, "c":3},
            {"a":4, "b":5, "c":6},
            {"a":7, "b":8, "c":9},
        ]`,
        options: {
            schema: 'main',
            name: 'foo',
            shape: duckdb.JSONTableShape.ROW_ARRAY,
            columns: {
                a: new arrow.Int16(),
                b: new arrow.Int32(),
                c: new arrow.Utf8(),
            },
        },
        query: 'SELECT * FROM main.foo',
        expectedColumns: [
            { name: 'a', values: [1, 4, 7] },
            { name: 'b', values: [2, 5, 8] },
            { name: 'c', values: ['3', '6', '9'] },
        ],
    },
];

const TEST_FILE = 'TEST';

export function testJSONInsert(db: () => duckdb.DuckDBBindings): void {
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
    describe('JSON Insert Sync', () => {
        for (const test of JSON_INSERT_TESTS) {
            it(test.name, () => {
                conn.runQuery(`DROP TABLE IF EXISTS ${test.options.schema || 'main'}.${test.options.name}`);
                const buffer = encoder.encode(test.input);
                db().registerFileBuffer(TEST_FILE, buffer);
                conn.insertJSONFromPath(TEST_FILE, test.options);
                const results = conn.runQuery(test.query);
                compareTable(results, test.expectedColumns);
            });
        }
    });
}

export function testJSONInsertAsync(db: () => duckdb.AsyncDuckDB): void {
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
    describe('JSON Insert Buffer Async', () => {
        for (const test of JSON_INSERT_TESTS) {
            it(test.name, async () => {
                await conn.runQuery(`DROP TABLE IF EXISTS ${test.options.schema || 'main'}.${test.options.name}`);
                const buffer = encoder.encode(test.input);
                await db().registerFileBuffer(TEST_FILE, buffer);
                await conn.insertJSONFromPath(TEST_FILE, test.options);
                const results = await conn.runQuery(test.query);
                compareTable(results, test.expectedColumns);
            });
        }
    });

    describe('JSON Insert Blob Async', () => {
        for (const test of JSON_INSERT_TESTS) {
            itBrowser(test.name, async () => {
                await conn.runQuery(`DROP TABLE IF EXISTS ${test.options.schema || 'main'}.${test.options.name}`);
                const buffer = encoder.encode(test.input);
                const blob = new Blob([buffer]);
                await db().registerFileHandle(TEST_FILE, blob);
                await conn.insertJSONFromPath(TEST_FILE, test.options);
                const results = await conn.runQuery(test.query);
                compareTable(results, test.expectedColumns);
            });
        }
    });
}
