import * as duckdb from '../src/';
import {LogLevel} from '../src/';
import * as arrow from 'apache-arrow';

export function testOPFS(baseDir: string, bundle: () => duckdb.DuckDBBundle): void {
    let db: duckdb.AsyncDuckDB;
    let conn: duckdb.AsyncDuckDBConnection;

    beforeAll(async () => {
        removeFiles();
    });

    afterAll(async () => {
        if (conn) {
            await conn.close();
        }
        if (db) {
            await db.terminate();
        }
        removeFiles();
    });

    beforeEach(async () => {
        removeFiles();
        //
        const logger = new duckdb.ConsoleLogger(LogLevel.ERROR);
        const worker = new Worker(bundle().mainWorker!);
        db = new duckdb.AsyncDuckDB(logger, worker);
        await db.instantiate(bundle().mainModule, bundle().pthreadWorker);
        await db.open({
            path: 'opfs://test.db',
            accessMode: duckdb.DuckDBAccessMode.READ_WRITE
        });
        conn = await db.connect();
    });

    afterEach(async () => {
        if (conn) {
            await conn.close();
        }
        if (db) {
            await db.terminate();
        }
        removeFiles();
    });

    describe('Load Data', () => {
        it('Imporet Small Parquet file', async () => {
            await conn.send(`CREATE TABLE stu AS SELECT * FROM "${baseDir}/uni/studenten.parquet"`);
            await conn.send(`CHECKPOINT;`);
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
            await conn.send(`CHECKPOINT;`);
            const result = await conn.send(`SELECT count(*)::INTEGER as cnt FROM lineitem;`);
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const table = await new arrow.Table<{ cnt: arrow.Int }>(batches);
            expect(table.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
        });

        it('Load Existing DB File in OPFS', async () => {
            await conn.send(`CREATE TABLE tmp AS SELECT * FROM "${baseDir}/tpch/0_01/parquet/lineitem.parquet"`);
            await conn.send(`CHECKPOINT;`);
            await conn.close();
            await db.terminate();

            const logger = new duckdb.ConsoleLogger(LogLevel.ERROR);
            const worker = new Worker(bundle().mainWorker!);
            db = new duckdb.AsyncDuckDB(logger, worker);
            await db.instantiate(bundle().mainModule, bundle().pthreadWorker);
            await db.open({
                path: 'opfs://test.db',
                accessMode: duckdb.DuckDBAccessMode.READ_WRITE
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
            const opfsRoot = await navigator.storage.getDirectory();
            const testHandle = await opfsRoot.getFileHandle('test.csv', {create: true});
            await db.registerFileHandle('test.csv', testHandle, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
            await conn.send(`CREATE TABLE zzz AS SELECT * FROM "${baseDir}/tpch/0_01/parquet/lineitem.parquet"`);
            await conn.send(`COPY (SELECT * FROM zzz) TO 'test.csv'`);
            await conn.close();
            await db.dropFile('test.csv');
            await db.reset();

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
            const parquetBuffer = await fetch(`${baseDir}/tpch/0_01/parquet/lineitem.parquet`).then(res =>
                res.arrayBuffer(),
            );
            const opfsRoot = await navigator.storage.getDirectory();
            const fileHandle = await opfsRoot.getFileHandle('test.parquet', {create: true});
            const writable = await fileHandle.createWritable();
            await writable.write(parquetBuffer);
            await writable.close();

            await db.registerFileHandle('test.parquet', fileHandle, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
            await conn.send(`CREATE TABLE lineitem AS SELECT * FROM read_parquet('test.parquet')`);
            await conn.send(`CHECKPOINT;`);

            const result = await conn.send(`SELECT count(*)::INTEGER as cnt FROM lineitem;`);
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const table = await new arrow.Table<{ cnt: arrow.Int }>(batches);
            expect(table.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
        });
    });

    async function removeFiles() {
        const opfsRoot = await navigator.storage.getDirectory();
        await opfsRoot.removeEntry('test.db').catch(() => {
        });
        await opfsRoot.removeEntry('test.db.wal').catch(() => {
        });
        await opfsRoot.removeEntry('test.csv').catch(() => {
        });
        await opfsRoot.removeEntry('test.parquet').catch(() => {
        });
    }
}
