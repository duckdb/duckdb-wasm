import * as duckdb from '../../src';
import * as arrow from 'apache-arrow';

// https://github.com/duckdb/duckdb-wasm/issues/2301
// The geoarrow metadata of a GEOMETRY with a CRS is resolved from the catalog, which needs a transaction. The schema
// of a materialized result was built after its auto-commit transaction ended. OGC:CRS84 is built into DuckDB, so this
// does not need the spatial extension.
export function test2301(db: () => duckdb.AsyncDuckDB): void {
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

    const SQL = `SELECT 'POINT (1 2)'::GEOMETRY::GEOMETRY('OGC:CRS84') AS g`;

    function expectCRS(schema: arrow.Schema) {
        const meta = JSON.parse(schema.fields[0].metadata.get('ARROW:extension:metadata') ?? '{}');
        expect(schema.fields[0].metadata.get('ARROW:extension:name')).toEqual('geoarrow.wkb');
        expect(meta.crs_type).toEqual('projjson');
        expect(meta.crs.id).toEqual({ authority: 'OGC', code: 'CRS84' });
    }

    describe('GitHub issues', () => {
        it('2301 query', async () => {
            const result = await conn.query(SQL);
            expectCRS(result.schema);
            expect(result.numRows).toEqual(1);
        });

        it('2301 send', async () => {
            for (const allowStreamResult of [false, true]) {
                const reader = await conn.send(SQL, allowStreamResult);
                // readAll closes the reader at the end of the stream, which resets reader.schema
                const table = new arrow.Table(await reader.readAll());
                expectCRS(table.schema);
                expect(table.numRows).toEqual(1);
            }
        });

        it('2301 prepared statement', async () => {
            const stmt = await conn.prepare(`SELECT 'POINT (1 2)'::GEOMETRY::GEOMETRY('OGC:CRS84') AS g WHERE ?`);
            expectCRS((await stmt.query(true)).schema);
            await stmt.close();
        });

        it('2301 explicit transaction', async () => {
            await conn.query('BEGIN TRANSACTION');
            expectCRS((await conn.query(SQL)).schema);
            await conn.query('COMMIT');
        });
    });
}
