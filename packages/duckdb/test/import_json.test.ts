import * as duckdb from '../src/';
import * as arrow from 'apache-arrow';

const encoder = new TextEncoder();

interface JSONImportTest {
    name: string;
    input: string;
    options: duckdb.JSONTableOptions;
    query: string;
    expectedColumnNames: string[];
    expectedColumnData: any[][];
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
        expectedColumnNames: ['a', 'b', 'c'],
        expectedColumnData: [
            [1, 4, 7],
            [2, 5, 8],
            [3, 6, 9],
        ],
    },
];

const PATH = 'TEST';

export function compareTable(table: arrow.Table, expectedColNames: string[], expectedColData: any[][]): void {
    // Check column count
    expect(expectedColNames.length).toEqual(expectedColData.length);
    const colCount = expectedColNames.length;
    expect(table.numCols).toEqual(colCount);
    if (colCount == 0) return;

    // Check columns
    const rowCount = expectedColData[0].length;
    for (let i = 0; i < colCount; ++i) {
        expect(expectedColData[i].length).toEqual(rowCount);
        expect(table.getColumnAt(i)?.length).toEqual(rowCount);
        expect(table.getColumnAt(i)?.name).toEqual(expectedColNames[i]);
    }

    // Compare the actual values
    for (let i = 0; i < colCount; ++i) {
        const col = table.getColumnAt(i)!;
        const have = [];
        for (let j = 0; j < rowCount; ++j) {
            have.push(col.get(j));
        }
        expect(have).toEqual(expectedColData[i]);
    }
}

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
                const buffer = encoder.encode(test.input);
                db().addFileBuffer(PATH, buffer);
                conn.importJSONFromPath(PATH, test.options);

                const results = conn.runQuery(test.query);
                compareTable(results, test.expectedColumnNames, test.expectedColumnData);
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
                const buffer = encoder.encode(test.input);
                await db().addFileBuffer(PATH, buffer);
                await conn.importJSONFromPath(PATH, test.options);

                const results = await conn.runQuery(test.query);
                compareTable(results, test.expectedColumnNames, test.expectedColumnData);
            });
        }
    });
}
