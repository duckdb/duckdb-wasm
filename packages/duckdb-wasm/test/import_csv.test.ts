import * as duckdb from '../src/';
import { Column, compareTable } from './table_test';

const encoder = new TextEncoder();

interface CSVImportTest {
    name: string;
    input: string;
    options: duckdb.CSVTableOptions;
    query: string;
    expectedColumns: Column[];
}

const CSV_IMPORT_TESTS: CSVImportTest[] = [
    {
        name: 'integers_auto_1',
        input: `"a","b","c"
1,2,3
4,5,6
7,8,9
`,
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
        name: 'integers_auto_2',
        input: `a,b,c
1,2,3
4,5,6
7,8,9
`,
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
        name: 'integers_auto_3',
        input: `a,b,c`,
        options: {
            schema: 'main',
            name: 'foo',
        },
        query: 'SELECT * FROM main.foo',
        expectedColumns: [
            { name: 'column0', values: ['a'] },
            { name: 'column1', values: ['b'] },
            { name: 'column2', values: ['c'] },
        ],
    },
    {
        name: 'integers_auto_2',
        input: `a
1
4
7
`,
        options: {
            schema: 'main',
            name: 'foo',
        },
        query: 'SELECT * FROM main.foo',
        expectedColumns: [{ name: 'a', values: [1, 4, 7] }],
    },
];

const TEST_FILE = 'TEST';

export function testCSVImport(db: () => duckdb.DuckDBBindings): void {
    let conn: duckdb.DuckDBConnection;

    beforeEach(async () => {
        db().flushFiles();
        conn = db().connect();
    });
    afterEach(async () => {
        conn.disconnect();
    });
    describe('CSV Import Sync', () => {
        for (const test of CSV_IMPORT_TESTS) {
            it(test.name, () => {
                conn.runQuery(`DROP TABLE IF EXISTS ${test.options.schema || 'main'}.${test.options.name}`);
                const buffer = encoder.encode(test.input);
                db().registerFileBuffer(TEST_FILE, buffer);
                conn.importCSVFromPath(TEST_FILE, test.options);
                const results = conn.runQuery(test.query);
                compareTable(results, test.expectedColumns);
            });
        }
    });
}

export function testCSVImportAsync(db: () => duckdb.AsyncDuckDB): void {
    let conn: duckdb.AsyncDuckDBConnection;

    beforeEach(async () => {
        await db().flushFiles();
        conn = await db().connect();
    });
    afterEach(async () => {
        await conn.disconnect();
    });
    describe('CSV Import Async', () => {
        for (const test of CSV_IMPORT_TESTS) {
            it(test.name, async () => {
                await conn.runQuery(`DROP TABLE IF EXISTS ${test.options.schema || 'main'}.${test.options.name}`);
                const buffer = encoder.encode(test.input);
                await db().registerFileBuffer(TEST_FILE, buffer);
                await conn.importCSVFromPath(TEST_FILE, test.options);
                const results = await conn.runQuery(test.query);
                compareTable(results, test.expectedColumns);
            });
        }
    });
}
