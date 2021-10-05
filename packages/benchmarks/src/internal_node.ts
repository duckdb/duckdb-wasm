import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb.module';
import * as duckdb_sync from '@duckdb/duckdb-wasm/dist/duckdb-node-sync';
import path from 'path';
import Worker from 'web-worker';

import { benchmarkFormat, benchmarkIterator, benchmarkIteratorAsync } from './internal';
import { runBenchmarks } from './suite';
import Benchmark from 'buffalo-bench/lib';

async function main() {
    let db: duckdb_sync.DuckDB | null = null;
    let adb: duckdb.AsyncDuckDB | null = null;
    let worker: Worker | null = null;

    // Configure the worker
    const DUCKDB_BUNDLE = await duckdb.selectBundle({
        asyncDefault: {
            mainModule: path.resolve(__dirname, '../../../duckdb-wasm/dist/duckdb.wasm'),
            mainWorker: path.resolve(__dirname, '../../../duckdb-wasm/dist/duckdb-node-async.worker.js'),
        },
        asyncNext: {
            mainModule: path.resolve(__dirname, '../../../duckdb-wasm/dist/duckdb-next.wasm'),
            mainWorker: path.resolve(__dirname, '../../../duckdb-wasm/dist/duckdb-node-async-next.worker.js'),
        },
    });

    const logger = new duckdb_sync.VoidLogger();
    db = await new duckdb_sync.DuckDB(
        logger,
        duckdb_sync.NODE_RUNTIME,
        path.resolve(__dirname, '../../../duckdb-wasm/dist/duckdb.wasm'),
    ).instantiate();

    worker = new Worker(DUCKDB_BUNDLE.mainWorker);
    adb = new duckdb.AsyncDuckDB(logger, worker);
    await adb.instantiate(DUCKDB_BUNDLE.mainModule);

    let suite: Benchmark[] = [];
    suite = suite.concat(benchmarkFormat(() => db!));
    suite = suite.concat(benchmarkIterator(() => db!));
    suite = suite.concat(benchmarkIteratorAsync(() => adb!));
    await runBenchmarks(suite);
}

main();
