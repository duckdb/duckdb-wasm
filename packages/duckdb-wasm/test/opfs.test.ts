import * as duckdb from '../src/';
import * as arrow from 'apache-arrow';

export function testOPFS(baseDir: string, bundle: () => duckdb.DuckDBBundle): void {
    const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.ERROR);
    let db: duckdb.AsyncDuckDB;
    let conn: duckdb.AsyncDuckDBConnection;

    beforeAll(async () => {
        await removeFiles();
    });

    afterAll(async () => {
        await removeFiles();
    });

    beforeEach(async () => {
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
            await conn.close().catch(() => {
            });
        }
        if (db) {
            await db.reset().catch(() => {
            });
            await db.terminate().catch(() => {
            });
            await db.dropFiles().catch(() => {
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

            const result = await conn.send(`SELECT count(*)::INTEGER as cnt FROM lineitem;`);
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

        it('Load Parquet file that are already with empty handler', async () => {
            //1. write to opfs
            const fileHandler = await getOpfsFileHandlerFromUrl({
                url: `${ baseDir }/tpch/0_01/parquet/lineitem.parquet`,
                path: 'test.parquet'
            });
            //2. handle is empty object, because worker gets a File Handle using the file name.
            await db.registerFileHandle('test.parquet', fileHandler, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
            //3. data preparation
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
            const fileHandler = await getOpfsFileHandlerFromUrl({
                url: `${ baseDir }/tpch/0_01/parquet/lineitem.parquet`,
                path: 'datadir/test.parquet'
            });
            //2. handle is opfs file handler
            await db.registerFileHandle('datadir/test.parquet', fileHandler, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
            //3. data preparation
            await conn.send(`CREATE TABLE lineitem1 AS SELECT * FROM read_parquet('datadir/test.parquet')`);
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
            //1. write to opfs
            const fileHandle = await getOpfsFileHandlerFromUrl({
                url: `${ baseDir }/tpch/0_01/parquet/lineitem.parquet`,
                path: 'test.parquet'
            });
            //2. handle is opfs file handler
            await db.registerFileHandle('test.parquet', fileHandle, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
            //3. data preparation
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
            //1. write to opfs
            const opfsRoot = await navigator.storage.getDirectory();
            const fileHandler = await opfsRoot.getFileHandle('test.csv', { create: true });
            //2. handle is opfs file handler
            await db.registerFileHandle('test.csv', fileHandler, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
            //3. data preparation
            await conn.send(`CREATE TABLE zzz AS SELECT * FROM '${ baseDir }/tpch/0_01/parquet/lineitem.parquet'`);
            await conn.send(`COPY (SELECT * FROM zzz) TO 'test.csv'`);
            await conn.send(`COPY (SELECT * FROM zzz) TO 'non_existing.csv'`);
            await conn.close();
            await db.dropFile('test.csv');
            await db.reset();

            conn = await db.connect();
            await db.registerFileHandle('test.csv', fileHandler, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);

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
            //1. write to opfs
            const opfsRoot = await navigator.storage.getDirectory();
            const testHandle1 = await opfsRoot.getFileHandle('test1.csv', { create: true });
            const testHandle2 = await opfsRoot.getFileHandle('test2.csv', { create: true });
            const testHandle3 = await opfsRoot.getFileHandle('test3.csv', { create: true });
            //2. handle is opfs file handler
            await db.registerFileHandle('test1.csv', testHandle1, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
            await db.registerFileHandle('test2.csv', testHandle2, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
            await db.registerFileHandle('test3.csv', testHandle3, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, true);
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
                autoFileRegistration: true
            };
            conn = await db.connect();
            //2. send query
            const result1 = await conn.send(`SELECT count(*)::INTEGER as cnt FROM 'opfs://test.parquet'`);
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
                autoFileRegistration: true
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
                autoFileRegistration: true
            };
            conn = await db.connect();
            //2. send query
            const result1 = await conn.send(`SELECT count(*)::INTEGER as cnt FROM 'opfs://datadir/test.parquet'`);
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
                    conn.send(`SELECT count(*)::INTEGER as cnt FROM 'opfs://datadir/test.parquet'`)
                ).toBeRejectedWithError("IO Error: No files found that match the pattern \"opfs://datadir/test.parquet\"");
            } finally {
                await db.reset();
                await db.dropFiles();
            }
        });

        it('Copy CSV to OPFS + Load CSV', async () => {
            //1. data preparation
            db.config.opfs = {
                autoFileRegistration: true
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
        await opfsRoot.removeEntry('test.db').catch(() => {
        });
        await opfsRoot.removeEntry('test.db.wal').catch(() => {
        });
        await opfsRoot.removeEntry('test.csv').catch(() => {
        });
        await opfsRoot.removeEntry('test1.csv').catch(() => {
        });
        await opfsRoot.removeEntry('test2.csv').catch(() => {
        });
        await opfsRoot.removeEntry('test3.csv').catch(() => {
        });
        await opfsRoot.removeEntry('test.parquet').catch(() => {
        });
        try {
            const datadir = await opfsRoot.getDirectoryHandle('datadir');
            datadir.removeEntry('test.parquet').catch(() => {
            });
        } catch (e) {
            //
        }
        await opfsRoot.removeEntry('datadir').catch(() => {
        });
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
