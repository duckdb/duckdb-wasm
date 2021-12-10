import * as duckdb from '../src/';

interface TableNameTest {
    name: string;
    input: string;
    tables: string[];
}

const TABLENAME_TESTS: TableNameTest[] = [
    {
        name: 'standard',
        input: 'SELECT * FROM my_table',
        tables: ['my_table'],
    },
    {
        name: 'fetch_specific',
        input: 'SELECT col_a FROM my_table',
        tables: ['my_table'],
    },
    {
        name: 'multiple_tables',
        input: 'SELECT * FROM my_table1, my_table2, my_table3',
        tables: ['my_table1', 'my_table2', 'my_table3'],
    },
    {
        name: 'same_table_multiple_times',
        input: 'SELECT col_a FROM my_table, my_table m2, my_table m3',
        tables: ['my_table'],
    },
    {
        name: 'subqueries',
        input: 'SELECT * FROM (SELECT * FROM (SELECT * FROM my_table) bla) bla3',
        tables: ['my_table'],
    },
    {
        name: 'join',
        input: 'SELECT col_a FROM my_table JOIN my_table2 ON (my_table.col_b=my_table2.col_d)',
        tables: ['my_table', 'my_table2'],
    },
    {
        name: 'scalar_subquery',
        input: 'SELECT (SELECT COUNT(*) FROM my_table)',
        tables: ['my_table'],
    },
    {
        name: 'set_operations',
        input: 'SELECT * FROM my_table UNION ALL SELECT * FROM my_table2 INTERSECT SELECT * FROM my_table3',
        tables: ['my_table', 'my_table2', 'my_table3'],
    },
    {
        name: 'window_functions',
        input: 'SELECT row_number() OVER (ORDER BY (SELECT i+j FROM my_table2)) FROM my_table',
        tables: ['my_table', 'my_table2'],
    },
];

export function testTableNames(db: () => duckdb.DuckDBBindings): void {
    let conn: duckdb.DuckDBConnection;
    beforeEach(() => {
        conn = db().connect();
    });
    afterEach(() => {
        conn.close();
    });
    describe('TableNames', () => {
        for (const test of TABLENAME_TESTS) {
            it(test.name, () => {
                const tables = conn.getTableNames(test.input);
                expect(tables).toEqual(tables);
            });
        }
    });
}

export function testTableNamesAsync(db: () => duckdb.AsyncDuckDB): void {
    let conn: duckdb.AsyncDuckDBConnection;
    beforeEach(async () => {
        conn = await db().connect();
    });
    afterEach(async () => {
        await conn.close();
    });
    describe('TableNames Async', () => {
        for (const test of TABLENAME_TESTS) {
            it(test.name, async () => {
                const tables = await conn.getTableNames(test.input);
                expect(tables).toEqual(tables);
            });
        }
    });
}
