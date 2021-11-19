import * as duckdb from '@duckdb/duckdb-wasm';
import * as arrow from 'apache-arrow';

(async () => {
    try {
        const DUCKDB_CONFIG = await duckdb.selectBundle({
            asyncDefault: {
                mainModule: './duckdb.wasm',
                mainWorker: './duckdb-browser.worker.js',
            },
            asyncNext: {
                mainModule: './duckdb-next.wasm',
                mainWorker: './duckdb-browser-next.worker.js',
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
