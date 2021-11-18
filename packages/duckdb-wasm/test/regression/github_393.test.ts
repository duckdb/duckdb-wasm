import * as duckdb from '../../src';
import * as arrow from 'apache-arrow';

// https://github.com/duckdb/duckdb-wasm/issues/393
export function testGitHubIssue393(db: () => duckdb.AsyncDuckDB): void {
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
    describe('GitHub issues', () => {
        it('393', async () => {
            await db().registerFileText(
                'test_date.csv',
                `iso_str,time_in_ms
2021-11-18 16:49:02,1637254142000
`,
            );
            await conn.query("CREATE TABLE test_date AS SELECT * FROM 'test_date.csv'");
            const date = await conn.query<{
                iso_str: arrow.DateMillisecond;
            }>('SELECT iso_str FROM test_date');
            // expect to receive a JavaScript Date object when we get the value
            expect(typeof date.toArray()[0].getMonth()).toEqual("function");
            await conn.query('DROP TABLE test_date');
        });
    });
}
