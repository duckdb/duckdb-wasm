/**
 * Staged smoke test of the threads bundle, each stage logged: a hang shows where. Run with
 * karma/threads-smoke-chrome.cjs (cross-origin isolated).
 */
import * as duckdb from '../src/';

const BUNDLE: duckdb.DuckDBBundle = {
    mainModule: '/static/duckdb-threads.wasm',
    mainWorker: '/static/duckdb-browser-threads.worker.js',
    pthreadWorker: '/static/duckdb-browser-threads.pthread.worker.js',
};

const stage = (name: string) => console.log(`[threads] ${name}`);

async function timed<T>(name: string, run: () => Promise<T>): Promise<T> {
    const t = performance.now();
    stage(`${name} ...`);
    const result = await run();
    stage(`${name} ok ${Math.round(performance.now() - t)}ms`);
    return result;
}

describe('threads bundle smoke', () => {
    it('runs queries, files and spilling with pthreads', async () => {
        stage(`crossOriginIsolated=${globalThis.crossOriginIsolated}`);
        const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.DEBUG);
        const worker = new Worker(BUNDLE.mainWorker!);
        const db = new duckdb.AsyncDuckDB(logger, worker);
        await timed('instantiate', () => db.instantiate(BUNDLE.mainModule, BUNDLE.pthreadWorker));
        await timed('open', () => db.open({ opfs: { fileHandling: 'auto' }, extensionRepository: new URL('/extensions', self.location.href).href, allowUnsignedExtensions: true }));
        const conn = await timed('connect', () => db.connect());
        const one = async (sql: string) => (await conn.query(sql)).toArray()[0]?.toJSON();
        const settings = await one(
            `SELECT current_setting('threads')::VARCHAR AS threads, current_setting('temp_directory') AS tmp, current_setting('home_directory') AS home`,
        );
        stage(`settings threads=${settings.threads} tmp=${settings.tmp} home=${settings.home}`);
        await timed('select 42', async () => expect((await one('SELECT 42 AS a')).a).toEqual(42));
        await timed('parallel scan', async () =>
            expect(Number((await one('SELECT count(*)::BIGINT AS c FROM range(20000000)')).c)).toEqual(20000000),
        );
        await timed('parallel aggregate', async () =>
            expect(Number((await one('SELECT count(DISTINCT i % 100000)::BIGINT AS c FROM range(5000000) t(i)')).c)).toEqual(100000),
        );
        await timed('registered buffer file', async () => {
            await db.registerFileText('smoke.csv', 'a,b\n1,2\n3,4\n');
            expect(Number((await one(`SELECT sum(a)::BIGINT AS s FROM 'smoke.csv'`)).s)).toEqual(4);
        });
        await timed('parquet autoload after queries', async () => {
            const bytes = new Uint8Array(await (await fetch('/data/uni/studenten.parquet')).arrayBuffer());
            await db.registerFileBuffer('studenten.parquet', bytes);
            const r = await one(`SELECT count(*)::INTEGER AS c FROM parquet_scan('studenten.parquet')`);
            expect(r.c).toEqual(8);
        });
        await timed('spill', async () => {
            await conn.query(`SET memory_limit = '128MB'`);
            const r = await one(`SELECT count(*)::INTEGER AS cnt FROM (SELECT i, repeat('x', 100) || i::VARCHAR AS s FROM range(1000000) t(i) ORDER BY s)`);
            expect(r.cnt).toEqual(1000000);
            await conn.query(`RESET memory_limit`);
        });
        await timed('opfs write + read', async () => {
            await conn.query(`COPY (SELECT 7 AS v) TO 'opfs://threads_smoke.csv'`);
            expect(Number((await one(`SELECT v FROM 'opfs://threads_smoke.csv'`)).v)).toEqual(7);
        });
        await timed('close', async () => {
            await conn.close();
            await db.terminate();
        });
    });
});
