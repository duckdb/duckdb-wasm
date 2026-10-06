import {
    AsyncDuckDB,
    AsyncDuckDBConnection,
    ConsoleLogger,
    DuckDBAccessMode,
    DuckDBBundle,
    DuckDBDataProtocol,
    LogLevel
} from '../src/';
import * as arrow from 'apache-arrow';

export function testOPFS(baseDir: string, bundle: () => DuckDBBundle): void {
    const logger = new ConsoleLogger(LogLevel.ERROR);

    let db: AsyncDuckDB;
    let conn: AsyncDuckDBConnection;

    beforeAll(async () => {
        await removeFiles();
    });

    afterAll(async () => {
        if (conn) {
            await conn.close();
        }
        if (db) {
            await db.terminate();
        }
        await removeFiles();
    });

    beforeEach(async () => {
        await removeFiles();
        const worker = new Worker(bundle().mainWorker!);
        db = new AsyncDuckDB(logger, worker);
        await db.instantiate(bundle().mainModule, bundle().pthreadWorker);
        await db.open({
            path: 'opfs://test.db',
            accessMode: DuckDBAccessMode.READ_WRITE
        });
        conn = await db.connect();
    });

    afterEach(async () => {
        if (conn) {
            await conn.close().catch(() => {
            });
        }
        if (db) {
            await db.reset().catch(() => {
            });
            // Release the OPFS handles before the worker goes away
            await db.dropFiles().catch(() => {
            });
            await db.terminate().catch(() => {
            });
        }
        await removeFiles();
    });

    describe('Load Data in OPFS', () => {
        it('Import Small Parquet file', async () => {
            //1. data preparation
            await conn.send(`CREATE TABLE stu AS SELECT * FROM "${ baseDir }/uni/studenten.parquet"`);
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
            //1. data preparation
            await conn.send(`CREATE TABLE lineitem AS SELECT * FROM "${ baseDir }/tpch/0_01/parquet/lineitem.parquet"`);
            await conn.send(`CHECKPOINT;`);

            const result = await conn.send(`SELECT count(*) ::INTEGER as cnt FROM lineitem;`);
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const table = await new arrow.Table<{ cnt: arrow.Int }>(batches);
            expect(table.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
        });

        it('Load Existing DB File', async () => {
            //1. data preparation
            await conn.send(`CREATE TABLE tmp AS SELECT * FROM "${ baseDir }/tpch/0_01/parquet/lineitem.parquet"`);
            await conn.send(`CHECKPOINT;`);

            await conn.close();
            await db.reset();
            await db.dropFiles();
            await db.terminate();

            const worker = new Worker(bundle().mainWorker!);
            db = new AsyncDuckDB(logger, worker);
            await db.instantiate(bundle().mainModule, bundle().pthreadWorker);
            await db.open({
                path: 'opfs://test.db',
                accessMode: DuckDBAccessMode.READ_WRITE
            });
            conn = await db.connect();

            const result = await conn.send(`SELECT count(*) ::INTEGER as cnt FROM tmp;`);
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const table = await new arrow.Table<{ cnt: arrow.Int }>(batches);
            expect(table.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
        });

        it('Create database and delete files without error', async () => {
            const registerFiles = async (instance: AsyncDuckDB) => {
                await instance.registerOPFSFileName('opfs://temp.db');
                await instance.registerOPFSFileName('opfs://temp.db.wal');
                await instance.registerOPFSFileName('opfs://temp.db.wal.checkpoint');
                await instance.registerOPFSFileName('opfs://temp.db.wal.recovery');
            };

            const dropFiles = async (instance: AsyncDuckDB) => {
                await instance.dropFiles([
                    'opfs://temp.db',
                    'opfs://temp.db.wal',
                    'opfs://temp.db.wal.checkpoint',
                    'opfs://temp.db.wal.recovery',
                ]);
            }

            await registerFiles(db);
            await conn.query("ATTACH 'opfs://temp.db' as opfs_db;");
            await conn.query("CREATE TABLE opfs_db.t (x VARCHAR)");
            await conn.query("INSERT INTO opfs_db.t VALUES ('hello world')");
            await conn.query('DETACH opfs_db;');
            await dropFiles(db);

            // A second instance should now be able to read the created files.
            // Without error, as there should be no lingering OPFS handles.
            const worker = new Worker(bundle().mainWorker!);
            const db2 = new AsyncDuckDB(logger, worker);
            await db2.instantiate(bundle().mainModule, bundle().pthreadWorker);
            await db2.open({ });
            const conn2 = await db2.connect();
            await registerFiles(db2);

            await conn2.query("ATTACH 'opfs://temp.db' as opfs_db;");
            const result = await conn2.send("SELECT * FROM opfs_db.t");
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const content = await new arrow.Table<{ t: arrow.Utf8 }>(batches).toArray();
            expect(content.length).toBe(1);
            expect(content[0].x).toBe('hello world');

            await conn2.query('DETACH opfs_db;');
            await dropFiles(db2);

            // Delete files, will error if there is still a handle open. opfs:// files live in /duckdb/fs
            const opfsRoot = await navigator.storage.getDirectory();
            const fsDir = await (await opfsRoot.getDirectoryHandle('duckdb')).getDirectoryHandle('fs');
            const handle = await fsDir.getFileHandle('temp.db');
            expect((await handle.getFile()).size).toBeGreaterThan(0);
            await fsDir.removeEntry('temp.db');
            for (const name of ['temp.db.wal', 'temp.db.wal.checkpoint', 'temp.db.wal.recovery']) {
                await fsDir.removeEntry(name).catch(_ignore);
            }
            conn2.close();
            db2.terminate();
        });

        it('Load Parquet file that are already with empty handler', async () => {
            //1. write to opfs
            const fileHandler = await getOpfsFileHandlerFromUrl({
                url: `${ baseDir }/tpch/0_01/parquet/lineitem.parquet`,
                path: 'test.parquet'
            });
            //2. handle is empty object, because worker gets a File Handle using the file name.
            await db.registerFileHandle('test.parquet', fileHandler, DuckDBDataProtocol.BROWSER_FSACCESS, true);
            //3. data preparation
            await conn.send(`CREATE TABLE lineitem1 AS SELECT * FROM read_parquet('test.parquet')`);
            await conn.send(`CHECKPOINT;`);

            const result1 = await conn.send(`SELECT count(*) ::INTEGER as cnt FROM lineitem1;`);
            const batches1 = [];
            for await (const batch of result1) {
                batches1.push(batch);
            }
            const table1 = await new arrow.Table<{ cnt: arrow.Int }>(batches1);
            expect(table1.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
        });

        it('Load Parquet file that are already with opfs file handler in datadir', async () => {
            //1. write to opfs
            const fileHandler = await getOpfsFileHandlerFromUrl({
                url: `${ baseDir }/tpch/0_01/parquet/lineitem.parquet`,
                path: 'datadir/test.parquet'
            });
            //2. handle is opfs file handler
            await db.registerFileHandle('datadir/test.parquet', fileHandler, DuckDBDataProtocol.BROWSER_FSACCESS, true);
            //3. data preparation
            await conn.send(`CREATE TABLE lineitem1 AS SELECT * FROM read_parquet('datadir/test.parquet')`);
            await conn.send(`CHECKPOINT;`);

            const result1 = await conn.send(`SELECT count(*) ::INTEGER as cnt FROM lineitem1;`);
            const batches1 = [];
            for await (const batch of result1) {
                batches1.push(batch);
            }
            const table1 = await new arrow.Table<{ cnt: arrow.Int }>(batches1);
            expect(table1.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
        });

        it('Load Parquet file that are already', async () => {
            //1. write to opfs
            const fileHandle = await getOpfsFileHandlerFromUrl({
                url: `${ baseDir }/tpch/0_01/parquet/lineitem.parquet`,
                path: 'test.parquet'
            });
            //2. handle is opfs file handler
            await db.registerFileHandle('test.parquet', fileHandle, DuckDBDataProtocol.BROWSER_FSACCESS, true);
            //3. data preparation
            await conn.send(`CREATE TABLE lineitem1 AS SELECT * FROM read_parquet('test.parquet')`);
            await conn.send(`CHECKPOINT;`);
            await conn.send(`CREATE TABLE lineitem2 AS SELECT * FROM read_parquet('test.parquet')`);
            await conn.send(`CHECKPOINT;`);
            await conn.send(`CREATE TABLE lineitem3 AS SELECT * FROM read_parquet('test.parquet')`);
            await conn.send(`CHECKPOINT;`);

            {
                const result1 = await conn.send(`SELECT count(*) ::INTEGER as cnt FROM lineitem1;`);
                const batches1 = [];
                for await (const batch of result1) {
                    batches1.push(batch);
                }
                const table1 = await new arrow.Table<{ cnt: arrow.Int }>(batches1);
                expect(table1.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
            }

            {
                const result2 = await conn.send(`SELECT count(*) ::INTEGER as cnt FROM lineitem2;`);
                const batches2 = [];
                for await (const batch of result2) {
                    batches2.push(batch);
                }
                const table2 = await new arrow.Table<{ cnt: arrow.Int }>(batches2);
                expect(table2.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
            }

            {
                const result3 = await conn.send(`SELECT count(*) ::INTEGER as cnt FROM lineitem3;`);
                const batches3 = [];
                for await (const batch of result3) {
                    batches3.push(batch);
                }
                const table3 = await new arrow.Table<{ cnt: arrow.Int }>(batches3);
                expect(table3.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
            }
        });

        it('Drop File + Export as CSV to OPFS + Load CSV', async () => {
            //1. write to opfs
            const opfsRoot = await navigator.storage.getDirectory();
            const fileHandler = await opfsRoot.getFileHandle('test.csv', { create: true });
            //2. handle is opfs file handler
            await db.registerFileHandle('test.csv', fileHandler, DuckDBDataProtocol.BROWSER_FSACCESS, true);
            //3. data preparation
            await conn.send(`CREATE TABLE zzz AS SELECT * FROM '${ baseDir }/tpch/0_01/parquet/lineitem.parquet'`);
            await conn.send(`COPY (SELECT * FROM zzz) TO 'test.csv'`);
            await conn.send(`COPY (SELECT * FROM zzz) TO 'non_existing.csv'`);
            await conn.close();
            await db.dropFile('test.csv');
            await db.reset();

            conn = await db.connect();
            await db.registerFileHandle('test.csv', fileHandler, DuckDBDataProtocol.BROWSER_FSACCESS, true);

            const result = await conn.send(`SELECT count(*) ::INTEGER as cnt FROM 'test.csv';`);
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const table = await new arrow.Table<{ cnt: arrow.Int }>(batches);
            expect(table.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);

            await db.dropFile('test.csv');
        });

        it('Drop Files + Export as CSV to OPFS + Load CSV', async () => {
            //1. write to opfs
            const opfsRoot = await navigator.storage.getDirectory();
            const testHandle1 = await opfsRoot.getFileHandle('test1.csv', { create: true });
            const testHandle2 = await opfsRoot.getFileHandle('test2.csv', { create: true });
            const testHandle3 = await opfsRoot.getFileHandle('test3.csv', { create: true });
            //2. handle is opfs file handler
            await db.registerFileHandle('test1.csv', testHandle1, DuckDBDataProtocol.BROWSER_FSACCESS, true);
            await db.registerFileHandle('test2.csv', testHandle2, DuckDBDataProtocol.BROWSER_FSACCESS, true);
            await db.registerFileHandle('test3.csv', testHandle3, DuckDBDataProtocol.BROWSER_FSACCESS, true);
            //3. data preparation
            await conn.send(`CREATE TABLE zzz AS SELECT * FROM "${ baseDir }/tpch/0_01/parquet/lineitem.parquet"`);
            await conn.send(`COPY (SELECT * FROM zzz) TO 'test1.csv'`);
            await conn.send(`COPY (SELECT * FROM zzz) TO 'test2.csv'`);
            await conn.send(`COPY (SELECT * FROM zzz) TO 'test3.csv'`);
            await conn.close();

            //4. dropFiles
            await db.dropFiles(['test1.csv', 'test2.csv', 'test3.csv']);

            //5. reset
            await db.reset();

            conn = await db.connect();
            await db.registerFileHandle('test1.csv', testHandle1, DuckDBDataProtocol.BROWSER_FSACCESS, true);
            await db.registerFileHandle('test2.csv', testHandle2, DuckDBDataProtocol.BROWSER_FSACCESS, true);
            await db.registerFileHandle('test3.csv', testHandle3, DuckDBDataProtocol.BROWSER_FSACCESS, true);

            {
                const result1 = await conn.send(`SELECT count(*) ::INTEGER as cnt FROM 'test1.csv';`);
                const batches1 = [];
                for await (const batch of result1) {
                    batches1.push(batch);
                }
                const table1 = await new arrow.Table<{ cnt: arrow.Int }>(batches1);
                expect(table1.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
            }
            {
                const result2 = await conn.send(`SELECT count(*) ::INTEGER as cnt FROM 'test2.csv';`);
                const batches2 = [];
                for await (const batch of result2) {
                    batches2.push(batch);
                }
                const table2 = await new arrow.Table<{ cnt: arrow.Int }>(batches2);
                expect(table2.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
            }
            {
                const result3 = await conn.send(`SELECT count(*) ::INTEGER as cnt FROM 'test3.csv';`);
                const batches3 = [];
                for await (const batch of result3) {
                    batches3.push(batch);
                }
                const table3 = await new arrow.Table<{ cnt: arrow.Int }>(batches3);
                expect(table3.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
            }
        });

        it('Load Parquet file when FROM clause', async () => {
            //1. write to opfs
            await getOpfsFileHandlerFromUrl({
                url: `${ baseDir }/tpch/0_01/parquet/lineitem.parquet`,
                path: 'test.parquet'
            });
            await conn.close();
            await db.reset();
            await db.dropFile('test.parquet');
            db.config.opfs = {
                fileHandling: "auto"
            };
            conn = await db.connect();
            //2. send query
            const result1 = await conn.send(`SELECT count(*) ::INTEGER as cnt FROM 'opfs://test.parquet'`);
            const batches1 = [];
            for await (const batch of result1) {
                batches1.push(batch);
            }
            const table1 = await new arrow.Table<{ cnt: arrow.Int }>(batches1);
            expect(table1.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
        });

        it('Load Parquet file when FROM clause + read_parquet', async () => {
            //1. write to opfs
            await getOpfsFileHandlerFromUrl({
                url: `${ baseDir }/uni/studenten.parquet`,
                path: 'test.parquet'
            });
            await conn.close();
            await db.reset();
            await db.dropFile('test.parquet');
            db.config.opfs = {
                fileHandling: "auto"
            };
            conn = await db.connect();
            //2. send query
            const result = await conn.send(`SELECT * FROM read_parquet('opfs://test.parquet');`);
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const table = await new arrow.Table<{ cnt: arrow.Int }>(batches);
            expect(table.getChildAt(0)?.toArray()).toEqual(
                new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555]),
            );
        });

        it('Load Parquet file with dir when FROM clause', async () => {
            //1. write to opfs
            await getOpfsFileHandlerFromUrl({
                url: `${ baseDir }/tpch/0_01/parquet/lineitem.parquet`,
                path: 'datadir/test.parquet'
            });
            await conn.close();
            await db.reset();
            await db.dropFile('datadir/test.parquet');
            db.config.opfs = {
                fileHandling: "auto"
            };
            conn = await db.connect();
            //2. send query
            const result1 = await conn.send(`SELECT count(*) ::INTEGER as cnt FROM 'opfs://datadir/test.parquet'`);
            const batches1 = [];
            for await (const batch of result1) {
                batches1.push(batch);
            }
            const table1 = await new arrow.Table<{ cnt: arrow.Int }>(batches1);
            expect(table1.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
        });

        it('Load Parquet file with dir when FROM clause with IO Error', async () => {
            //1. write to opfs
            await getOpfsFileHandlerFromUrl({
                url: `${ baseDir }/tpch/0_01/parquet/lineitem.parquet`,
                path: 'datadir/test.parquet'
            });
            try {
                //2. send query
                await expectAsync(
                    conn.send(`SELECT count(*) ::INTEGER as cnt FROM 'opfs://datadir/test.parquet'`)
                ).toBeRejectedWithError("IO Error: No files found that match the pattern \"opfs://datadir/test.parquet\"");
            } finally {
                await db.reset();
                await db.dropFiles();
            }
        });

        it('Partitioned COPY creates directories, glob and a second instance see them', async () => {
            db.config.opfs = { fileHandling: 'auto' };
            await conn.query(`
                COPY (SELECT i % 3 AS part, i FROM range(30) t(i)) TO 'opfs://out' (FORMAT PARQUET, PARTITION_BY (part))
            `);
            // Globbing and hive partitioning over the directories of this instance
            const count = await conn.query(`
                SELECT count(*)::INTEGER AS cnt, count(DISTINCT part)::INTEGER AS parts
                FROM read_parquet('opfs://out/*/*.parquet', hive_partitioning = true)
            `);
            expect(count.getChildAt(0)?.get(0)).toEqual(30);
            expect(count.getChildAt(1)?.get(0)).toEqual(3);
            const files = await conn.query(`SELECT file FROM glob('opfs://out/**/*.parquet') ORDER BY file`);
            expect(files.numRows).toEqual(3);
            expect(files.getChildAt(0)?.get(0)).toMatch(/^opfs:\/\/out\/part=0\//);

            // Another instance opens the directory tree as it is in OPFS
            const worker = new Worker(bundle().mainWorker!);
            const db2 = new AsyncDuckDB(logger, worker);
            await db2.instantiate(bundle().mainModule, bundle().pthreadWorker);
            await db2.open({ opfs: { fileHandling: 'auto' } });
            const conn2 = await db2.connect();
            try {
                const count2 = await conn2.query(`
                    SELECT count(*)::INTEGER AS cnt FROM read_parquet('opfs://out/**/*.parquet')
                `);
                expect(count2.getChildAt(0)?.get(0)).toEqual(30);
            } finally {
                await conn2.close();
                await db2.terminate();
            }
        });

        it('Copy CSV to OPFS + Load CSV', async () => {
            //1. data preparation
            db.config.opfs = {
                fileHandling: "auto"
            };
            await conn.query(`COPY ( SELECT 32 AS value ) TO 'opfs://file.csv'`);
            await conn.query(`COPY ( SELECT 42 AS value ) TO 'opfs://file.csv'`);
            const result = await conn.send(`SELECT * FROM 'opfs://file.csv';`);
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const table = await new arrow.Table<{ cnt: arrow.Int }>(batches);
            expect(table.getChildAt(0)?.toArray()).toEqual(
                new BigInt64Array([42n]),
            );
        });
    });

    async function removeFiles() {
        const opfsRoot = await navigator.storage.getDirectory();
        // opfs:// files live under /duckdb/fs. The scratch directories under /duckdb/scratch belong to the
        // instances (the shared test database holds one for the whole run), dead ones are reconciled at the next
        // mount. A terminated worker releases its access handles asynchronously, the removal is retried until
        // they are gone
        for (let attempt = 0; ; ++attempt) {
            try {
                const root = await opfsRoot.getDirectoryHandle('duckdb');
                await root.removeEntry('fs', { recursive: true });
                break;
            } catch (e: any) {
                if (e?.name === 'NotFoundError') break;
                if (attempt >= 50) throw e;
                await new Promise(resolve => setTimeout(resolve, 20));
            }
        }
        await opfsRoot.removeEntry('test.db').catch(_ignore);
        await opfsRoot.removeEntry('test.db.wal').catch(_ignore);
        await opfsRoot.removeEntry('test.db.wal.checkpoint').catch(_ignore);
        await opfsRoot.removeEntry('test.db.wal.recovery').catch(_ignore);
        await opfsRoot.removeEntry('test.csv').catch(_ignore);
        await opfsRoot.removeEntry('test1.csv').catch(_ignore);
        await opfsRoot.removeEntry('test2.csv').catch(_ignore);
        await opfsRoot.removeEntry('test3.csv').catch(_ignore);
        await opfsRoot.removeEntry('test.parquet').catch(_ignore);
        try {
            const datadir = await opfsRoot.getDirectoryHandle('datadir');
            datadir.removeEntry('test.parquet').catch(_ignore);
        } catch (e) {
            //
        }
        await opfsRoot.removeEntry('datadir').catch(_ignore);
    }

    async function getOpfsFileHandlerFromUrl(params: {
        url: string;
        path: string;
    }): Promise<FileSystemFileHandle> {
        const PATH_SEP_REGEX = /\/|\\/;
        const parquetBuffer = await fetch(params.url).then(res =>
            res.arrayBuffer(),
        );
        const opfsRoot = await navigator.storage.getDirectory();
        let dirHandle: FileSystemDirectoryHandle = opfsRoot;
        let fileName = params.path;
        if (PATH_SEP_REGEX.test(params.path)) {
            const folders = params.path.split(PATH_SEP_REGEX);
            fileName = folders.pop()!;
            if (!fileName) {
                throw new Error(`Invalid path ${ params.path }`);
            }
            for (const folder of folders) {
                dirHandle = await dirHandle.getDirectoryHandle(folder, { create: true });
            }
        }
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(parquetBuffer);
        await writable.close();

        return fileHandle;
    }
}

//ignore block
const _ignore: () => void = () => {};
