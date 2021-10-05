import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb.module';
import * as duckdb_sync from '@duckdb/duckdb-wasm/dist/duckdb-browser-sync';
import Worker from 'web-worker';

import { benchmarkFormat, benchmarkIterator, benchmarkIteratorAsync } from './internal';

async function main() {
    let db: duckdb_sync.DuckDB | null = null;
    let adb: duckdb.AsyncDuckDB | null = null;
    let worker: Worker | null = null;

    const DUCKDB_BUNDLE = await duckdb.selectBundle({
        asyncDefault: {
            mainModule: '/static/duckdb.wasm',
            mainWorker: '/static/duckdb-browser-async.worker.js',
        },
        asyncNext: {
            mainModule: '/static/duckdb-next.wasm',
            mainWorker: '/static/duckdb-browser-async-next.worker.js',
        },
        asyncNextCOI: {
            mainModule: '/static/duckdb-next-coi.wasm',
            mainWorker: '/static/duckdb-browser-async-next-coi.worker.js',
            pthreadWorker: '/static/duckdb-browser-async-next-coi.pthread.worker.js',
        },
    });

    const logger = new duckdb_sync.VoidLogger();
    db = new duckdb_sync.DuckDB(logger, duckdb_sync.BROWSER_RUNTIME, '/static/duckdb.wasm');
    await db.instantiate();

    worker = new Worker(DUCKDB_BUNDLE.mainWorker!);
    adb = new duckdb.AsyncDuckDB(logger, worker);
    await adb.instantiate(DUCKDB_BUNDLE.mainModule, DUCKDB_BUNDLE.pthreadWorker);

    for (const bm of benchmarkFormat(() => db!)) {
        await bm.run();
    }
    for (const bm of benchmarkIterator(() => db!)) {
        await bm.run();
    }
    for (const bm of benchmarkIteratorAsync(() => adb!)) {
        await bm.run();
    }
}

/// Karma hook
(window as any).karmaCustomEnv = {};
(window as any).karmaCustomEnv.execute = async function (karma: any, window: any) {
    await main();

    karma.result({ success: true, suite: [], log: [] });
    karma.complete({});
};
