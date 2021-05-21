import * as duckdb from '../src/';
// import * as arrow from 'apache-arrow';

interface CSVImportTest {
    name: string;
    input: string;
    options: duckdb.CSVTableOptions;
    query: string;
    expectedOutput: string;
}

const CSV_IMPORT_TESTS: CSVImportTest[] = [
    {
        name: 'rows_integers',
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
        expectedOutput: '',
    },
];

export function testCSVImport(db: () => duckdb.DuckDBBindings): void {
    let conn: duckdb.DuckDBConnection;

    beforeEach(async () => {
        conn = db().connect();
    });
    afterEach(async () => {
        conn.disconnect();
    });
    describe('CSV Import Tests', () => {
        for (const test of CSV_IMPORT_TESTS) {
            it(test.name, () => {
                expect(null).toBeNull();
            });
        }
    });
}

export function testCSVImportAsync(db: () => duckdb.AsyncDuckDB): void {
    let conn: duckdb.AsyncDuckDBConnection;

    beforeEach(async () => {
        conn = await db().connect();
    });
    afterEach(async () => {
        await conn.disconnect();
    });
    describe('CSV Import Tests', () => {
        for (const test of CSV_IMPORT_TESTS) {
            it(test.name, async () => {
                expect(null).toBeNull();
            });
        }
    });
}
