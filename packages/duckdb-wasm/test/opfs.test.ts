import * as duckdb from '../src/';
import * as arrow from 'apache-arrow';

export function testOPFS(baseDir: string, bundle: () => duckdb.DuckDBBundle): void {
    // we use a separate db instance here because karma will run all tests in parallel,
    // a seperate db avoid the conflict because we use db.open here
    let db: duckdb.AsyncDuckDB;
    let conn: duckdb.AsyncDuckDBConnection;

    beforeAll(async () => {
        const opfsRoot = await navigator.storage.getDirectory();
        await opfsRoot.removeEntry('test.db').catch(e => {});
        const logger = new duckdb.ConsoleLogger();
        const worker = new Worker(bundle().mainWorker!);
        db = new duckdb.AsyncDuckDB(logger, worker);
        await db.instantiate(bundle().mainModule, bundle().pthreadWorker);
    });

    afterAll(async () => {
        await conn.close();
        await db.terminate();
    });

    beforeEach(async () => {
        const opfsRoot = await navigator.storage.getDirectory();
        await opfsRoot.removeEntry('test.db').catch(e => {});
        await db.open({
            path: 'opfs://test.db',
            accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
        });
        conn = await db.connect();
    });

    afterEach(async () => {
        await conn.close();
        // switching from opfs db to in-memory db will close and release the file
        await db.open({});
    });

    describe('Load Data', () => {
        it('Imporet Small Parquet file', async () => {
            await conn.send(`CREATE TABLE stu AS SELECT * FROM "${baseDir}/uni/studenten.parquet"`);
            const result = await conn.send(`SELECT matrnr FROM stu;`);
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const table = await new arrow.Table<{ cnt: arrow.Int }>(batches);
            expect(table.getChildAt(0)?.toArray()).toEqual(
                new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555]),
            );
        });

        it('Import Larget Parquet file', async () => {
            await conn.send(`CREATE TABLE lineitem AS SELECT * FROM "${baseDir}/tpch/0_01/parquet/lineitem.parquet"`);
            const result = await conn.send(`SELECT count(*)::INTEGER as cnt FROM lineitem;`);
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const table = await new arrow.Table<{ cnt: arrow.Int }>(batches);
            expect(table.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
        });

        it('Load Existing DB File in OPFS', async () => {
            // first create a db file with data
            await conn.send(`CREATE TABLE tmp AS SELECT * FROM "${baseDir}/tpch/0_01/parquet/lineitem.parquet"`);
            await conn.send(`CHECKPOINT;`);
            // exit, reopen and load the persisted db file
            await conn.close();
            await db.open({});
            await db.open({
                path: 'opfs://test.db',
                accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
            });
            conn = await db.connect();

            const result = await conn.send(`SELECT count(*)::INTEGER as cnt FROM tmp;`);
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const table = await new arrow.Table<{ cnt: arrow.Int }>(batches);
            expect(table.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
        });
    });
}
