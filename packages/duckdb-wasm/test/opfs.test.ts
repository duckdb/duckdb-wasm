import * as duckdb from '../src/';
import { LogLevel } from '../src/';
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
            accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
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

    describe('Load Data in OPFS', () => {
        it('Import Small Parquet file', async () => {
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

        it('Load Existing DB File', async () => {
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

        it('Load Parquet file that are already with empty handler', async () => {
            //1. write to opfs
            const parquetBuffer = await fetch(`${baseDir}/tpch/0_01/parquet/lineitem.parquet`).then(res =>
                res.arrayBuffer(),
            );
            const opfsRoot = await navigator.storage.getDirectory();
            const fileHandle = await opfsRoot.getFileHandle('test.parquet', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(parquetBuffer);
            await writable.close();
            //2. handle is empty object, because worker gets a File Handle using the file name.
            await db.registerFileHandle('test.parquet', null, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
            await conn.send(`CREATE TABLE lineitem1 AS SELECT * FROM read_parquet('test.parquet')`);
            await conn.send(`CHECKPOINT;`);

            const result1 = await conn.send(`SELECT count(*)::INTEGER as cnt FROM lineitem1;`);
            const batches1 = [];
            for await (const batch of result1) {
                batches1.push(batch);
            }
            const table1 = await new arrow.Table<{ cnt: arrow.Int }>(batches1);
            expect(table1.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
        });

        it('Load Parquet file that are already with opfs file handler in datadir', async () => {
            //1. write to opfs
            const parquetBuffer = await fetch(`${baseDir}/tpch/0_01/parquet/lineitem.parquet`).then(res =>
                res.arrayBuffer(),
            );
            const opfsRoot = await navigator.storage.getDirectory();
            const datadir = await opfsRoot.getDirectoryHandle('datadir', { create: true });
            const fileHandle = await datadir.getFileHandle('test.parquet', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(parquetBuffer);
            await writable.close();
            //2. handle is opfs file handler
            await db.registerFileHandle('test.parquet', fileHandle, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
            await conn.send(`CREATE TABLE lineitem1 AS SELECT * FROM read_parquet('test.parquet')`);
            await conn.send(`CHECKPOINT;`);

            const result1 = await conn.send(`SELECT count(*)::INTEGER as cnt FROM lineitem1;`);
            const batches1 = [];
            for await (const batch of result1) {
                batches1.push(batch);
            }
            const table1 = await new arrow.Table<{ cnt: arrow.Int }>(batches1);
            expect(table1.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
        });

        it('Load Parquet file that are already', async () => {
            const parquetBuffer = await fetch(`${baseDir}/tpch/0_01/parquet/lineitem.parquet`).then(res =>
                res.arrayBuffer(),
            );
            const opfsRoot = await navigator.storage.getDirectory();
            const fileHandle = await opfsRoot.getFileHandle('test.parquet', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(parquetBuffer);
            await writable.close();

            await db.registerFileHandle('test.parquet', fileHandle, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
            await conn.send(`CREATE TABLE lineitem1 AS SELECT * FROM read_parquet('test.parquet')`);
            await conn.send(`CHECKPOINT;`);
            await conn.send(`CREATE TABLE lineitem2 AS SELECT * FROM read_parquet('test.parquet')`);
            await conn.send(`CHECKPOINT;`);
            await conn.send(`CREATE TABLE lineitem3 AS SELECT * FROM read_parquet('test.parquet')`);
            await conn.send(`CHECKPOINT;`);

            {
                const result1 = await conn.send(`SELECT count(*)::INTEGER as cnt FROM lineitem1;`);
                const batches1 = [];
                for await (const batch of result1) {
                    batches1.push(batch);
                }
                const table1 = await new arrow.Table<{ cnt: arrow.Int }>(batches1);
                expect(table1.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
            }

            {
                const result2 = await conn.send(`SELECT count(*)::INTEGER as cnt FROM lineitem2;`);
                const batches2 = [];
                for await (const batch of result2) {
                    batches2.push(batch);
                }
                const table2 = await new arrow.Table<{ cnt: arrow.Int }>(batches2);
                expect(table2.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
            }

            {
                const result3 = await conn.send(`SELECT count(*)::INTEGER as cnt FROM lineitem3;`);
                const batches3 = [];
                for await (const batch of result3) {
                    batches3.push(batch);
                }
                const table3 = await new arrow.Table<{ cnt: arrow.Int }>(batches3);
                expect(table3.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
            }
        });

        it('Drop File + Export as CSV to OPFS + Load CSV', async () => {
            const opfsRoot = await navigator.storage.getDirectory();
            const testHandle = await opfsRoot.getFileHandle('test.csv', { create: true });
            await db.registerFileHandle('test.csv', testHandle, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
            await conn.send(`CREATE TABLE zzz AS SELECT * FROM "${baseDir}/tpch/0_01/parquet/lineitem.parquet"`);
            await conn.send(`COPY (SELECT * FROM zzz) TO 'test.csv'`);
            await conn.send(`COPY (SELECT * FROM zzz) TO 'non_existing.csv'`);
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

            await db.dropFile('test.csv');
        });

        it('Drop Files + Export as CSV to OPFS + Load CSV', async () => {
            const opfsRoot = await navigator.storage.getDirectory();
            const testHandle1 = await opfsRoot.getFileHandle('test1.csv', { create: true });
            const testHandle2 = await opfsRoot.getFileHandle('test2.csv', { create: true });
            const testHandle3 = await opfsRoot.getFileHandle('test3.csv', { create: true });
            await db.registerFileHandle('test1.csv', testHandle1, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
            await db.registerFileHandle('test2.csv', testHandle2, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
            await db.registerFileHandle('test3.csv', testHandle3, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);

            await conn.send(`CREATE TABLE zzz AS SELECT * FROM "${baseDir}/tpch/0_01/parquet/lineitem.parquet"`);
            await conn.send(`COPY (SELECT * FROM zzz) TO 'test1.csv'`);
            await conn.send(`COPY (SELECT * FROM zzz) TO 'test2.csv'`);
            await conn.send(`COPY (SELECT * FROM zzz) TO 'test3.csv'`);
            await conn.close();

            await db.dropFiles();
            await db.reset();

            await db.open({});
            conn = await db.connect();
            await db.registerFileHandle('test1.csv', testHandle1, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
            await db.registerFileHandle('test2.csv', testHandle2, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
            await db.registerFileHandle('test3.csv', testHandle3, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);

            {
                const result1 = await conn.send(`SELECT count(*)::INTEGER as cnt FROM 'test1.csv';`);
                const batches1 = [];
                for await (const batch of result1) {
                    batches1.push(batch);
                }
                const table1 = await new arrow.Table<{ cnt: arrow.Int }>(batches1);
                expect(table1.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
            }
            {
                const result2 = await conn.send(`SELECT count(*)::INTEGER as cnt FROM 'test2.csv';`);
                const batches2 = [];
                for await (const batch of result2) {
                    batches2.push(batch);
                }
                const table2 = await new arrow.Table<{ cnt: arrow.Int }>(batches2);
                expect(table2.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
            }
            {
                const result3 = await conn.send(`SELECT count(*)::INTEGER as cnt FROM 'test3.csv';`);
                const batches3 = [];
                for await (const batch of result3) {
                    batches3.push(batch);
                }
                const table3 = await new arrow.Table<{ cnt: arrow.Int }>(batches3);
                expect(table3.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
            }

            await db.dropFiles();
        });
    });

    describe('Open database in OPFS', () => {
        it('should not open a non-existent DB file in read-only', async () => {
            const logger = new duckdb.ConsoleLogger(LogLevel.ERROR);
            const worker = new Worker(bundle().mainWorker!);
            const db_ = new duckdb.AsyncDuckDB(logger, worker);
            await db_.instantiate(bundle().mainModule, bundle().pthreadWorker);

            await expectAsync(db_.open({
                path: 'opfs://non_existent.db',
                accessMode: duckdb.DuckDBAccessMode.READ_ONLY,
            })).toBeRejectedWithError(Error, /file or directory could not be found/);

            await db_.terminate();
            await worker.terminate();

            // Files should not be found with DuckDBAccessMode.READ_ONLY
            const opfsRoot = await navigator.storage.getDirectory();
            await expectAsync(opfsRoot.getFileHandle('non_existent.db', { create: false }))
                .toBeRejectedWithError(Error, /file or directory could not be found/);
        });

        it('should not open a non-existent DB file and mkdir in read-only', async () => {
            const logger = new duckdb.ConsoleLogger(LogLevel.ERROR);
            const worker = new Worker(bundle().mainWorker!);
            const db_ = new duckdb.AsyncDuckDB(logger, worker);
            await db_.instantiate(bundle().mainModule, bundle().pthreadWorker);

            await expectAsync(db_.open({
                path: 'opfs://duckdb_test/path/to/non_existent.db',
                accessMode: duckdb.DuckDBAccessMode.READ_ONLY,
            })).toBeRejectedWithError(Error, /file or directory could not be found/);

            await db_.terminate();
            await worker.terminate();
        });

        it('should open a non-existent DB file and mkdir in read-write', async () => {
            const logger = new duckdb.ConsoleLogger(LogLevel.ERROR);
            const worker = new Worker(bundle().mainWorker!);
            const db_ = new duckdb.AsyncDuckDB(logger, worker);
            await db_.instantiate(bundle().mainModule, bundle().pthreadWorker);

            await expectAsync(db_.open({
                path: 'opfs://duckdb_test/path/to/duck.db',
                accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
            })).toBeResolved();

            await db_.terminate();
            await worker.terminate();
        });

        it('should open a non-existent DB file in read-write and create files', async () => {
            const logger = new duckdb.ConsoleLogger(LogLevel.ERROR);
            const worker = new Worker(bundle().mainWorker!);
            const db_ = new duckdb.AsyncDuckDB(logger, worker);
            await db_.instantiate(bundle().mainModule, bundle().pthreadWorker);

            const opfsRoot = await navigator.storage.getDirectory();

            // Ensure files do not exist
            await expectAsync(opfsRoot.getFileHandle('non_existent_2.db', { create: false }))
                .toBeRejectedWithError(Error, /file or directory could not be found/);
            await expectAsync(opfsRoot.getFileHandle('non_existent_2.db.wal', { create: false }))
                .toBeRejectedWithError(Error, /file or directory could not be found/);

            await expectAsync(db_.open({
                path: 'opfs://non_existent_2.db',
                accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
            })).toBeResolved();

            await db_.terminate();
            await worker.terminate();

            // Files should be found with DuckDBAccessMode.READ_WRITE
            await expectAsync(opfsRoot.getFileHandle('non_existent_2.db', { create: false })).toBeResolved();
            await expectAsync(opfsRoot.getFileHandle('non_existent_2.db.wal', { create: false })).toBeResolved();
        });
    })

    async function removeFiles() {
        const opfsRoot = await navigator.storage.getDirectory();
        await opfsRoot.removeEntry('test.db').catch(() => {});
        await opfsRoot.removeEntry('test.db.wal').catch(() => {});
        await opfsRoot.removeEntry('test.csv').catch(() => {});
        await opfsRoot.removeEntry('test1.csv').catch(() => {});
        await opfsRoot.removeEntry('test2.csv').catch(() => {});
        await opfsRoot.removeEntry('test3.csv').catch(() => {});
        await opfsRoot.removeEntry('test.parquet').catch(() => {});
        try {
            const datadir = await opfsRoot.getDirectoryHandle('datadir');
            datadir.removeEntry('test.parquet').catch(() => {});
        } catch (e) {
            //
        }
        await opfsRoot.removeEntry('datadir').catch(() => {});

        // In case of failure caused leftovers
        await opfsRoot.removeEntry('non_existent.db').catch(() => {});
        await opfsRoot.removeEntry('non_existent.db.wal').catch(() => {});
        await opfsRoot.removeEntry('non_existent_2.db').catch(() => {});
        await opfsRoot.removeEntry('non_existent_2.db.wal').catch(() => {});
        await opfsRoot.removeEntry('duckdb_test', { recursive: true }).catch(() => {});
    }
}
