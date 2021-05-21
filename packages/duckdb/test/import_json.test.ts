import * as duckdb from '../src/';
// import * as arrow from 'apache-arrow';

interface JSONImportTest {
    name: string;
    input: string;
    options: duckdb.JSONTableOptions;
    query: string;
    expectedOutput: string;
}

const JSON_IMPORT_TESTS: JSONImportTest[] = [
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
        expectedOutput: '',
    },
];

export function testJSONImport(db: () => duckdb.DuckDBBindings): void {
    let conn: duckdb.DuckDBConnection;

    beforeEach(async () => {
        db().dropFiles();
        conn = db().connect();
    });
    afterEach(async () => {
        conn.disconnect();
    });
    describe('JSON Import Sync', () => {
        for (const test of JSON_IMPORT_TESTS) {
            it(test.name, () => {
                expect(null).toBeNull();
            });
        }
    });
}

export function testJSONImportAsync(db: () => duckdb.AsyncDuckDB): void {
    let conn: duckdb.AsyncDuckDBConnection;

    beforeEach(async () => {
        await db().dropFiles();
        conn = await db().connect();
    });
    afterEach(async () => {
        await conn.disconnect();
    });
    describe('JSON Import Async', () => {
        for (const test of JSON_IMPORT_TESTS) {
            it(test.name, async () => {
                expect(null).toBeNull();
            });
        }
    });
}
