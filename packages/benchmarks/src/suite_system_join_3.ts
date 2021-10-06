import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb-esm';
import * as duckdb_sync from '@duckdb/duckdb-wasm/dist/duckdb-node-sync';
import {
    ArqueroIntegerJoin3Benchmark,
    DuckDBSyncMaterializingIntegerJoin3Benchmark,
    SystemBenchmark,
    SystemBenchmarkContext,
} from './system';
import { runSystemBenchmarks } from './suite';
//import initSQLJs from 'sql.js';
import Worker from 'web-worker';
import path from 'path';

async function main() {
    // Setup DuckDB sync & async
    let duckdbDB: duckdb_sync.DuckDB | null = null;
    let duckdbAsyncDB: duckdb.AsyncDuckDB | null = null;
    let duckdbWorker: Worker | null = null;
    const DUCKDB_BUNDLE = await duckdb.selectBundle({
        asyncDefault: {
            mainModule: path.resolve(__dirname, '../../duckdb-wasm/dist/duckdb.wasm'),
            mainWorker: path.resolve(__dirname, '../../duckdb-wasm/dist/duckdb-node-async.worker.js'),
        },
        asyncNext: {
            mainModule: path.resolve(__dirname, '../../duckdb-wasm/dist/duckdb-next.wasm'),
            mainWorker: path.resolve(__dirname, '../../duckdb-wasm/dist/duckdb-node-async-next.worker.js'),
        },
    });
    const logger = new duckdb_sync.VoidLogger();
    duckdbDB = await new duckdb_sync.DuckDB(
        logger,
        duckdb_sync.NODE_RUNTIME,
        path.resolve(__dirname, '../../duckdb-wasm/dist/duckdb.wasm'),
    ).instantiate();
    duckdbWorker = new Worker(DUCKDB_BUNDLE.mainWorker);
    duckdbAsyncDB = new duckdb.AsyncDuckDB(logger, duckdbWorker);
    await duckdbAsyncDB.instantiate(DUCKDB_BUNDLE.mainModule);

    // Setup sql.js
    // const sqljsConfig = await initSQLJs();
    // const sqljsDB = new sqljsConfig.Database();

    const ctx: SystemBenchmarkContext = {
        seed: Math.random(),
    };
    const suite: SystemBenchmark[] = [
        new DuckDBSyncMaterializingIntegerJoin3Benchmark(duckdbDB, 1000, 10000, 100000, 100, 10, 10),
        new ArqueroIntegerJoin3Benchmark(1000, 10000, 100000, 100, 10, 10),
    ];
    const results = await runSystemBenchmarks(ctx, suite);
    console.log(results);

    // Terminate the worker
    duckdbAsyncDB.terminate();
}

main();
