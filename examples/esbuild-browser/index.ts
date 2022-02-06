import * as duckdb from '@kimmolinna/duckdb-wasm';
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
