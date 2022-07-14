import * as duckdb from '../src/';

const testRows = 10000;

export function testCancelAsync(db: () => duckdb.AsyncDuckDB): void {
    let conn: duckdb.AsyncDuckDBConnection;

    beforeEach(async () => {
        conn = await db().connect();
    });

    afterEach(async () => {
        await conn.close();
        await db().flushFiles();
        await db().dropFiles();
    });

    describe('AsyncDuckDB', () => {
        it('ping', async () => {
            await db().ping();
        });
    });

    describe('Cancel Query Test', () => {
        it('sample', async () => {
            conn.send(`SELECT SUM(i) FROM range(10000000) tbl(i);`);
            conn.cancel();
        });
    });
}
