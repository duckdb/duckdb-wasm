import * as duckdb from '../../src';
import * as arrow from 'apache-arrow';

// https://github.com/duckdb/duckdb-wasm/issues/470
export function test470(db: () => duckdb.AsyncDuckDB): void {
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
        it('470', async () => {

            // Baseline without cast: we expect an error to be thrown because of the duration type that is emitted
            await db().open({
                path: ':memory:',
                query: {
                    castDurationToTime64: false,
                },
            });
            conn = await db().connect();
            conn.query<{
                interval: arrow.TimeMicrosecond;
            }>(`SELECT INTERVAL '3' MONTH AS interval`)
                .then((x) => fail("Query is expected to fail due to duration type not being implemented"))
                .catch(x => {expect(x).toEqual(new Error("Unrecognized type: \"Duration\" (18)"))});

            // Cast explicitly enabled: Time64 value is returned
            await db().open({
                path: ':memory:',
                query: {
                    castDurationToTime64: true,
                },
            });
            conn = await db().connect();
            const resultWithCast = await conn.query<{
                interval:  arrow.TimeMicrosecond;
            }>(`SELECT INTERVAL '3' MONTH AS interval`);
            expect(resultWithCast.toArray()[0].interval?.toString()).toEqual("7776000000000");

            // Cast should be on by default
            await db().open({
                path: ':memory:',
                query: {
                },
            });
            conn = await db().connect();
            const resultWithDefault = await conn.query<{
                interval:  arrow.TimeMicrosecond;
            }>(`SELECT INTERVAL '3' MONTH AS interval`);
            expect(resultWithDefault.toArray()[0].interval?.toString()).toEqual("7776000000000");
        });
    });
}
