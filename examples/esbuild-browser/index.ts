import * as duckdb from '@duckdb/duckdb-wasm';
import * as arrow from 'apache-arrow';

(async () => {
    try {
        const DUCKDB_CONFIG = await duckdb.selectBundle({
            base: {
                mainModule: './duckdb-base.wasm',
                mainWorker: './duckdb-browser-base.worker.js',
            },
            threads: {
                mainModule: './duckdb-threads.wasm',
                mainWorker: './duckdb-browser-threads.worker.js',
                pthreadWorker: './duckdb-browser-threads.pthread.worker.js',
            },
        });

        const logger = new duckdb.ConsoleLogger();
        const worker = new Worker(DUCKDB_CONFIG.mainWorker!);
        const db = new duckdb.AsyncDuckDB(logger, worker);
        await db.instantiate(DUCKDB_CONFIG.mainModule, DUCKDB_CONFIG.pthreadWorker);

        const conn = await db.connect();
        await conn.query<{ v: arrow.Int }>(`SELECT count(*)::INTEGER as v FROM generate_series(0, 100) t(v)`);

        await conn.close();
        await db.terminate();
        await worker.terminate();
    } catch (e) {
        console.error(e);
    }
})();
