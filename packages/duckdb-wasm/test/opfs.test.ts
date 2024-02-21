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

        it('Export as CSV to OPFS + Load CSV that are already in OPFS', async () => {
            // 1. register a opfs file handle so csv data can be exported from duckdb to opfs
            const opfsRoot = await navigator.storage.getDirectory();
            await opfsRoot.removeEntry('test.csv').catch(() => {});
            const testHandle = await opfsRoot.getFileHandle('test.csv', { create: true });
            await db.registerFileHandle('test.csv', testHandle, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
            // 2. export csv data to opfs
            await conn.send(`COPY (SELECT * FROM "${baseDir}/tpch/0_01/parquet/lineitem.parquet") TO 'test.csv'`);
            // 3. exit, reopen and load the csv file
            await db.dropFile('test.csv');
            await conn.close();
            await db.open({});
            conn = await db.connect();
            await db.registerFileHandle('test.csv', testHandle, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);

            const result = await conn.send(`SELECT count(*)::INTEGER as cnt FROM 'test.csv';`);
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const table = await new arrow.Table<{ cnt: arrow.Int }>(batches);
            expect(table.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
        });

        it('Load Parquet file that are already in OPFS', async () => {
            // download parquet
            const parquetBuffer = await fetch(`${baseDir}/tpch/0_01/parquet/lineitem.parquet`).then(res =>
                res.arrayBuffer(),
            );

            // write parquet to opfs
            const opfsRoot = await navigator.storage.getDirectory();
            await opfsRoot.removeEntry('test.parquet').catch(() => {});
            const fileHandle = await opfsRoot.getFileHandle('test.parquet', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(parquetBuffer);
            await writable.close();

            // load parquet from opfs using read_parquet function
            //   Note: even if we do not use read_parquet function, it works as well, here we use read_parquet to test the function
            await db.registerFileHandle('test.parquet', fileHandle, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
            await conn.send(`CREATE TABLE lineitem AS SELECT * FROM read_parquet('test.parquet')`);

            const result = await conn.send(`SELECT count(*)::INTEGER as cnt FROM lineitem;`);
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const table = await new arrow.Table<{ cnt: arrow.Int }>(batches);
            expect(table.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
        });
    });
}
