import * as duckdb from '../src/';

export function testSpill(db: () => duckdb.AsyncDuckDB): void {
    let conn: duckdb.AsyncDuckDBConnection;

    describe('Spilling', () => {
        beforeEach(async () => {
            conn = await db().connect();
        });

        afterEach(async () => {
            await conn.query(`RESET memory_limit`);
            await conn.close();
        });

        it('goes to js_buffer:// by default', async () => {
            const setting = await conn.query(`SELECT current_setting('temp_directory') AS dir`);
            expect(setting.getChildAt(0)?.get(0)).toEqual('js_buffer://tmp');
        });

        it('completes a sort above the memory limit', async () => {
            await conn.query(`SET memory_limit = '64MB'`);
            // ~110MB of strings cannot be sorted within the limit without spilling
            const result = await conn.query(`
                SELECT count(*)::INTEGER AS cnt, min(s) AS first
                FROM (SELECT i, repeat('x', 100) || i::VARCHAR AS s FROM range(1000000) t(i) ORDER BY s)
            `);
            expect(result.getChildAt(0)?.get(0)).toEqual(1000000);
        });
    });
}
