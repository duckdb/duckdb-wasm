import * as duckdb from '../../src';

// https://github.com/duckdb/duckdb-wasm/issues/2076
export function test2076(db: () => duckdb.AsyncDuckDB): void {
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
        it('2076', async () => {
            // Generate first parquet file with 2 columns
            await conn.query(`CREATE TABLE t1 AS SELECT 1 as id, 'first' as name`);
            await conn.query(`COPY t1 TO 'test.parquet' (FORMAT PARQUET)`);
            const parquet1 = await db().copyFileToBuffer('test.parquet');
            await db().dropFile('test.parquet');
            await conn.query(`DROP TABLE t1`);

            // Generate second parquet file with different content (3 columns)
            await conn.query(`CREATE TABLE t2 AS SELECT 100 as value, 200 as other, 300 as third`);
            await conn.query(`COPY t2 TO 'test2.parquet' (FORMAT PARQUET)`);
            const parquet2 = await db().copyFileToBuffer('test2.parquet');
            await db().dropFile('test2.parquet');
            await conn.query(`DROP TABLE t2`);

            // Register first parquet at path 'data.parquet'
            await db().registerFileBuffer('data.parquet', parquet1);
            const result1 = await conn.query(`SELECT * FROM parquet_scan('data.parquet')`);
            expect(result1.numRows).toEqual(1);
            expect(result1.schema.fields.length).toEqual(2);

            // Drop the file
            await db().dropFile('data.parquet');

            // Step 3: Register second parquet at SAME path
            await db().registerFileBuffer('data.parquet', parquet2);

            // Query should return data from second file
            const result2 = await conn.query(`SELECT * FROM parquet_scan('data.parquet')`);
            expect(result2.numRows).toEqual(1);
            expect(result2.schema.fields.length).toEqual(3);
        });
    });
}
