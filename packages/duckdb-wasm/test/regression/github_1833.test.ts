import * as duckdb from '../../src';

// https://github.com/duckdb/duckdb-wasm/issues/1833
export function test1833(db: () => duckdb.AsyncDuckDB): void {
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
        it('1833', async () => {
        await conn.query(`
          CREATE TABLE "Test" (value VARCHAR)
        `);
        const stmt = await conn.prepare(`
          INSERT INTO "Test" (value)
          VALUES (?)
        `);
        await stmt.query('🦆🦆🦆🦆🦆');
        await stmt.query('goo␀se');
        await stmt.query('goo\u0000se');
        const result = await conn.query(`
          SELECT * FROM "Test"
        `);
            expect(result.schema.fields.length).toBe(1);
            expect(result.schema.fields[0].name).toBe('value');
            expect(result.toArray().length).toEqual(3);
            expect(result.toArray()[2].value.length).toEqual(6);
        });
    });
}
