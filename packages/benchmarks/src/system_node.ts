//import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb.module';
import * as duckdb_sync from '@duckdb/duckdb-wasm/dist/duckdb-node-sync';
import {
    SystemBenchmarkContext,
    SystemBenchmark,
    SqljsIntegerScanBenchmark,
    AlasqlIntegerScanBenchmark,
    ArqueroIntegerScanBenchmark,
    LovefieldIntegerScanBenchmark,
    DuckDBSyncMaterializingIntegerScanBenchmark,
} from './system';
import { runSystemBenchmarks } from './suite';
import initSQLJs from 'sql.js';
//import Worker from 'web-worker';
import path from 'path';

async function main() {
    let duckdbDB: duckdb_sync.DuckDB | null = null;
    // const duckdbAsyncDB: duckdb.AsyncDuckDB | null = null;
    // const duckdbWorker: Worker | null = null;

    // // Configure the worker
    // const DUCKDB_BUNDLE = await duckdb.selectBundle({
    //     asyncDefault: {
    //         mainModule: path.resolve(__dirname, '../../../duckdb-wasm/dist/duckdb.wasm'),
    //         mainWorker: path.resolve(__dirname, '../../../duckdb-wasm/dist/duckdb-node-async.worker.js'),
    //     },
    //     asyncNext: {
    //         mainModule: path.resolve(__dirname, '../../../duckdb-wasm/dist/duckdb-next.wasm'),
    //         mainWorker: path.resolve(__dirname, '../../../duckdb-wasm/dist/duckdb-node-async-next.worker.js'),
    //     },
    // });

    // Setup sync DuckDB
    const logger = new duckdb_sync.VoidLogger();
    duckdbDB = await new duckdb_sync.DuckDB(
        logger,
        duckdb_sync.NODE_RUNTIME,
        path.resolve(__dirname, '../../../duckdb-wasm/dist/duckdb.wasm'),
    ).instantiate();

    // // Setup async DuckDB
    // duckdbWorker = new Worker(DUCKDB_BUNDLE.mainWorker);
    // duckdbAsyncDB = new duckdb.AsyncDuckDB(logger, duckdbWorker);
    // await duckdbAsyncDB.instantiate(DUCKDB_BUNDLE.mainModule);

    // Setup sql.js
    const sqljsConfig = await initSQLJs();
    const sqljsDB = new sqljsConfig.Database();

    const ctx: SystemBenchmarkContext = {
        seed: Math.random(),
    };
    const suite: SystemBenchmark[] = [
        new DuckDBSyncMaterializingIntegerScanBenchmark(duckdbDB, 1000),
        new DuckDBSyncMaterializingIntegerScanBenchmark(duckdbDB, 10000),
        new DuckDBSyncMaterializingIntegerScanBenchmark(duckdbDB, 100000),
        new DuckDBSyncMaterializingIntegerScanBenchmark(duckdbDB, 1000000),
        new LovefieldIntegerScanBenchmark(1000),
        new AlasqlIntegerScanBenchmark(1000),
        new AlasqlIntegerScanBenchmark(10000),
        new AlasqlIntegerScanBenchmark(100000),
        new ArqueroIntegerScanBenchmark(1000),
        new ArqueroIntegerScanBenchmark(10000),
        new ArqueroIntegerScanBenchmark(100000),
        new ArqueroIntegerScanBenchmark(1000000),
        new SqljsIntegerScanBenchmark(sqljsDB, 1000),
        new SqljsIntegerScanBenchmark(sqljsDB, 10000),
        new SqljsIntegerScanBenchmark(sqljsDB, 100000),
        new SqljsIntegerScanBenchmark(sqljsDB, 1000000),
    ];
    const results = await runSystemBenchmarks(ctx, suite);
    console.log(results);
}

main();
