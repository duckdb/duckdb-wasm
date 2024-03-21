import * as arrow from 'apache-arrow';
import * as duckdb from '../src/';
import { DuckDBDataProtocol } from '../src/';
import { Column, compareTable } from './table_test';

function describeBrowser(description: string, specDefinitions: () => void): void {
    if (typeof window !== 'undefined') {
        describe(description, specDefinitions);
    }
}

const encoder = new TextEncoder();

interface CSVInsertTest {
    name: string;
    input: string;
    options: duckdb.CSVInsertOptions;
    query: string;
    expectedColumns: Column[];
}

const CSV_INSERT_TESTS: CSVInsertTest[] = [
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
            { name: 'a', values: [] },
            { name: 'b', values: [] },
            { name: 'c', values: [] },
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
    {
        name: 'options_1',
        input: `1,2,3
4,5,6
7,8,9
`,
        options: {
            schema: 'main',
            name: 'foo2',
            header: false,
            detect: false,
            columns: {
                a: new arrow.Int16(),
                b: new arrow.Int32(),
                c: new arrow.Utf8(),
            },
        },
        query: 'SELECT * FROM main.foo2',
        expectedColumns: [
            { name: 'a', values: [1, 4, 7] },
            { name: 'b', values: [2, 5, 8] },
            { name: 'c', values: ['3', '6', '9'] },
        ],
    },
    {
        name: 'options_2',
        input: `1|2|01/02/2020
4|5|01/03/2020
7|8|01/04/2020
`,
        options: {
            schema: 'main',
            name: 'foo',
            detect: false,
            header: false,
            delimiter: '|',
            dateFormat: '%m/%d/%Y',
            columns: {
                a: new arrow.Int16(),
                b: new arrow.Int32(),
                c: new arrow.DateDay(),
            },
        },
        query: 'SELECT * FROM main.foo',
        expectedColumns: [
            { name: 'a', values: [1, 4, 7] },
            { name: 'b', values: [2, 5, 8] },
            {
                name: 'c',
                values: [
                    new Date(Date.UTC(2020, 0, 2)),
                    new Date(Date.UTC(2020, 0, 3)),
                    new Date(Date.UTC(2020, 0, 4)),
                ],
            },
        ],
    },
    {
        name: 'options_3',
        input: `1|2|20:32:45 1992-03-02
4|5|20:32:50 1992-03-02
7|8|20:32:55 1992-03-02
`,
        options: {
            schema: 'main',
            name: 'foo',
            detect: false,
            header: false,
            delimiter: '|',
            quote: "'",
            timestampFormat: '%H:%M:%S %Y-%m-%d',
            columns: {
                a: new arrow.Int16(),
                b: new arrow.Int32(),
                c: new arrow.TimestampSecond(),
            },
        },
        query: 'SELECT * FROM main.foo',
        expectedColumns: [
            { name: 'a', values: [1, 4, 7] },
            { name: 'b', values: [2, 5, 8] },
            {
                name: 'c',
                values: [
                    new Date(Date.UTC(1992, 2, 2, 20, 32, 45)).getTime(),
                    new Date(Date.UTC(1992, 2, 2, 20, 32, 50)).getTime(),
                    new Date(Date.UTC(1992, 2, 2, 20, 32, 55)).getTime(),
                ],
            },
        ],
    },
];

const TEST_FILE = 'TEST';

export function testCSVInsert(db: () => duckdb.DuckDBBindings): void {
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
    describe('CSV Insert Sync', () => {
        for (const test of CSV_INSERT_TESTS) {
            it(test.name, () => {
                conn.query(`DROP TABLE IF EXISTS ${test.options.schema || 'main'}.${test.options.name}`);
                const buffer = encoder.encode(test.input);
                db().registerFileBuffer(TEST_FILE, buffer);
                conn.insertCSVFromPath(TEST_FILE, test.options);
                const results = conn.query(test.query);
                compareTable(results, test.expectedColumns);
            });
        }
    });
}

export function testCSVInsertAsync(db: () => duckdb.AsyncDuckDB): void {
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
    describe('CSV Insert Buffer Async', () => {
        for (const test of CSV_INSERT_TESTS) {
            it(test.name, async () => {
                await conn.query(`DROP TABLE IF EXISTS ${test.options.schema || 'main'}.${test.options.name}`);
                const buffer = encoder.encode(test.input);
                await db().registerFileBuffer(TEST_FILE, buffer);
                await conn.insertCSVFromPath(TEST_FILE, test.options);
                const results = await conn.query(test.query);
                compareTable(results, test.expectedColumns);
            });
        }
    });

    describeBrowser('CSV Insert Blob Async', () => {
        for (const test of CSV_INSERT_TESTS) {
            it(test.name, async () => {
                await conn.query(`DROP TABLE IF EXISTS ${test.options.schema || 'main'}.${test.options.name}`);
                const buffer = encoder.encode(test.input);
                const blob = new Blob([buffer]);
                await db().registerFileHandle(TEST_FILE, blob, DuckDBDataProtocol.BROWSER_FILEREADER, false);
                await conn.insertCSVFromPath(TEST_FILE, test.options);
                const results = await conn.query(test.query);
                compareTable(results, test.expectedColumns);
            });
        }
    });
}
