/** Instance churn on the threads bundle: create, query, terminate, many times. Each instance brings 9 workers. */
import * as duckdb from '../src/';

const BUNDLE: duckdb.DuckDBBundle = {
    mainModule: '/static/duckdb-threads.wasm',
    mainWorker: '/static/duckdb-browser-threads.worker.js',
    pthreadWorker: null,
};

describe('threads bundle churn', () => {
    it('survives 150 instances', async () => {
        const logger = new duckdb.VoidLogger();
        for (let i = 0; i < 150; i++) {
            const t = performance.now();
            const worker = new Worker(BUNDLE.mainWorker!);
            const db = new duckdb.AsyncDuckDB(logger, worker);
            await db.instantiate(BUNDLE.mainModule, BUNDLE.pthreadWorker);
            await db.open({});
            const conn = await db.connect();
            const r = await conn.query(`SELECT count(*)::INTEGER AS c FROM range(100000)`);
            expect(r.getChildAt(0)?.get(0)).toEqual(100000);
            await conn.close();
            await db.terminate();
            if (i % 10 === 0 || performance.now() - t > 2000) {
                console.log(`[churn] instance ${i} ${Math.round(performance.now() - t)}ms`);
            }
        }
    });
});
