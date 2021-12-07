import * as duckdb from '../../src';
import * as arrow from 'apache-arrow';

// https://github.com/duckdb/duckdb-wasm/issues/448
export function test448(db: () => duckdb.AsyncDuckDB): void {
    let conn: duckdb.AsyncDuckDBConnection | null = null;
    beforeEach(async () => {
        await db().flushFiles();
    });
    afterEach(async () => {
        if (conn) {
            await conn.close();
            conn = null;
        }
        await db().flushFiles();
        await db().dropFiles();
    });
    describe('GitHub issues', () => {
        it('448', async () => {
            conn = await db().connect();
            await conn.query(`create temp table test448(i integer)`);
            await conn.query(`insert into test448 values (1),(2),(1)`);
            let result = await conn.query(`select * from test448`);
            expect(result.numCols).toBe(1);
            expect(result.length).toBe(3);
            expect(result.getColumnAt(0)?.toArray()).toEqual(new Int32Array([1, 2, 1]));
            result = await conn.query<{ i: arrow.Map_<arrow.Int32, arrow.Uint64> }>(`select histogram(i) from test448`);
            expect(result.numCols).toBe(1);
            expect(result.length).toBe(1);
            const array = result.getColumnAt(0)!.toArray();
            expect(array.length).toEqual(1);
            expect(array[0].toString()).toEqual('{ 1: 2, 2: 1 }');
        });
    });
}
