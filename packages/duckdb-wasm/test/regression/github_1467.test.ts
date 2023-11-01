import * as duckdb from '../../src';

// https://github.com/duckdb/duckdb-wasm/issues/477
// Note that when ArrowJS supports negative decimals, castDecimalToDouble should probably be deprecated.
export function test1467(db: () => duckdb.AsyncDuckDB): void {
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
        it('1467', async () => {
            // Baseline without cast: we expect decimal values to not handle fractional parts correctly
            await db().open({
                path: ':memory:',
                query: {},
            });
            conn = await db().connect();
            const resultWithoutCast = await conn.query(`select substring('🦆🦆🦆' from 3) AS result;`);
            expect(resultWithoutCast.toArray()[0]?.result).toEqual('🦆');
        });
    });
}
