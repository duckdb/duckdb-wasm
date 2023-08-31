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
            // Baseline without cast: we expect decimal values to not handle fractional parts correctly
            await db().open({
                path: ':memory:',
                query: {},
            });
            conn = await db().connect();
            const resultWithoutCast = await conn.query(`SELECT (-1.9)::DECIMAL(2,1) as decimal`);
            expect(resultWithoutCast.schema.fields[0].type.scale).toEqual(1);
            expect(resultWithoutCast.schema.fields[0].type.precision).toEqual(2);
            // Arrow JS now handles negative decimals, but not the fractional part.
            expect(resultWithoutCast.toArray()[0]?.decimal == -19).toBe(true);

            // Using castDecimalToDouble we force decimals to be cast to doubles, note the inevitable imprecision.
            await db().open({
                path: ':memory:',
                query: {
                    castDecimalToDouble: true,
                },
            });
            conn = await db().connect();
            const resultWithCast = await conn.query<{
                decimal: arrow.Float64;
            }>(`SELECT (-1.9)::DECIMAL(2,1) as decimal`);
            expect(resultWithCast.toArray()[0]?.decimal).toEqual(-1.9000000000000001);
        });
    });
}
