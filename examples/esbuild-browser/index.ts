import * as duckdb from '@duckdb/duckdb-wasm';
import * as arrow from 'apache-arrow';

(async () => {
    try {
        const DUCKDB_CONFIG = await duckdb.selectBundle({
            mvp: {
                mainModule: './duckdb-mvp.wasm',
                mainWorker: './duckdb-browser-mvp.worker.js',
            },
            eh: {
                mainModule: './duckdb-eh.wasm',
                mainWorker: './duckdb-browser-eh.worker.js',
            },
            coi: {
                mainModule: './duckdb-coi.wasm',
                mainWorker: './duckdb-browser-coi.worker.js',
                pthreadWorker: './duckdb-browser-coi.pthread.worker.js',
            },
        });

        const logger = new duckdb.ConsoleLogger();
        const worker = new Worker(DUCKDB_CONFIG.mainWorker!);
        const db = new duckdb.AsyncDuckDB(logger, worker);
        await db.instantiate(DUCKDB_CONFIG.mainModule, DUCKDB_CONFIG.pthreadWorker);

        // in-memory
        const conn = await db.connect();
        await conn.query<{ v: arrow.Int }>(`SELECT count(*)::INTEGER as v FROM generate_series(0, 100) t(v)`);

        // opfs
        // const opfsRoot = await navigator.storage.getDirectory();
        // await opfsRoot.removeEntry('test.db').catch(e => {});
        // await db.open({
        //     path: 'opfs://test.db',
        //     accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
        // });
        // const conn = await db.connect();
        // await conn.send(`CREATE TABLE integers(i INTEGER, j INTEGER);`);
        // await conn.send(`INSERT INTO integers VALUES (3, 4), (5, 6);`);
        // await conn.send(`CHECKPOINT;`);
        // console.log(await conn.query(`SELECT * FROM integers;`));

        await conn.close();
        await db.terminate();
        await worker.terminate();
    } catch (e) {
        console.error(e);
    }
})();
