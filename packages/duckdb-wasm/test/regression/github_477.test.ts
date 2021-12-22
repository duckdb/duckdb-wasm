import * as duckdb from '../../src';
import * as arrow from 'apache-arrow';

// https://github.com/duckdb/duckdb-wasm/issues/477
// Note that when ArrowJS supports negative decimals, castDecimalToDouble should probably be deprecated.
export function test477(db: () => duckdb.AsyncDuckDB): void {
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
        it('477', async () => {

            // Baseline without cast: we expect the negative decimal values to not work accurately
            await db().open({
                path: ':memory:',
                query: {
                },
            });
            conn = await db().connect();
            const resultWithoutCast = await conn.query(`SELECT (-1.9)::DECIMAL(2,1) as decimal`);
            expect(resultWithoutCast.schema.fields[0].type.scale).toEqual(1);
            expect(resultWithoutCast.schema.fields[0].type.precision).toEqual(2);
            // If this assertion breaks, arrow JS was likely updated to handle negative values
            expect(resultWithoutCast.toArray()[0].decimal.valueOf() == -19).toBe(false);


            // Using castDecimalToDouble we force decimals to be cast to doubles, note the inevitable imprecision.
            await db().open({
                path: ':memory:',
                query: {
                    castDecimalToDouble : true
                },
            });
            conn = await db().connect();
            const resultWithCast = await conn.query<{
                decimal: arrow.Float64
            }>(`SELECT (-1.9)::DECIMAL(2,1) as decimal`);
            expect(resultWithCast.toArray()[0].decimal?.valueOf()).toEqual(-1.9000000000000001);
        });
    });
}
