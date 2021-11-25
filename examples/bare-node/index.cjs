const duckdb = require('@duckdb/duckdb-wasm');
const path = require('path');
const Worker = require('web-worker');

(async () => {
    try {
        const DUCKDB_DIST = path.resolve(__dirname, '../../node_modules/@duckdb/duckdb-wasm/dist/');
        const DUCKDB_CONFIG = await duckdb.selectBundle({
            mvp: {
                mainModule: path.resolve(DUCKDB_DIST, './duckdb.wasm'),
                mainWorker: path.resolve(DUCKDB_DIST, './duckdb-node.worker.cjs'),
            },
            next: {
                mainModule: path.resolve(DUCKDB_DIST, './duckdb-next.wasm'),
                mainWorker: path.resolve(DUCKDB_DIST, './duckdb-node-next.worker.cjs'),
            },
        });

        const logger = new duckdb.ConsoleLogger();
        const worker = new Worker(DUCKDB_CONFIG.mainWorker);
        const db = new duckdb.AsyncDuckDB(logger, worker);
        await db.instantiate(DUCKDB_CONFIG.mainModule, DUCKDB_CONFIG.pthreadWorker);

        const conn = await db.connect();
        await conn.query(`SELECT count(*)::INTEGER as v FROM generate_series(0, 100) t(v)`);

        await conn.close();
        await db.terminate();
        await worker.terminate();
    } catch (e) {
        console.error(e);
    }
})();
