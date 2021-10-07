import { setupDuckDBSync, setupDuckDBAsync, setupSqljs, writeReport } from './setup';
import {
    SystemBenchmarkContext,
    SystemBenchmark,
    SqljsIntegerScanBenchmark,
    AlasqlIntegerScanBenchmark,
    ArqueroIntegerScanBenchmark,
    LovefieldIntegerScanBenchmark,
    DuckDBAsyncIntegerScanBenchmark,
    DuckDBSyncIntegerScanBenchmark,
} from './system';
import { runSystemBenchmarks } from './suite';

async function main() {
    const duckdbSync = await setupDuckDBSync();
    const duckdbAsync = await setupDuckDBAsync();
    const sqljsDB = await setupSqljs();
    const ctx: SystemBenchmarkContext = {
        seed: Math.random(),
    };
    const suite: SystemBenchmark[] = [
        new DuckDBSyncIntegerScanBenchmark(duckdbSync, 1000),
        new DuckDBSyncIntegerScanBenchmark(duckdbSync, 10000),
        new DuckDBSyncIntegerScanBenchmark(duckdbSync, 100000),
        new DuckDBSyncIntegerScanBenchmark(duckdbSync, 1000000),
        new DuckDBAsyncIntegerScanBenchmark(duckdbAsync, 1000),
        new DuckDBAsyncIntegerScanBenchmark(duckdbAsync, 10000),
        new DuckDBAsyncIntegerScanBenchmark(duckdbAsync, 100000),
        new DuckDBAsyncIntegerScanBenchmark(duckdbAsync, 1000000),
        new SqljsIntegerScanBenchmark(sqljsDB, 1000),
        new SqljsIntegerScanBenchmark(sqljsDB, 10000),
        new SqljsIntegerScanBenchmark(sqljsDB, 100000),
        new SqljsIntegerScanBenchmark(sqljsDB, 1000000),
        new ArqueroIntegerScanBenchmark(1000),
        new ArqueroIntegerScanBenchmark(10000),
        new ArqueroIntegerScanBenchmark(100000),
        new ArqueroIntegerScanBenchmark(1000000),
        new AlasqlIntegerScanBenchmark(1000),
        new AlasqlIntegerScanBenchmark(10000),
        new AlasqlIntegerScanBenchmark(100000),
        new LovefieldIntegerScanBenchmark(1000),
    ];
    const results = await runSystemBenchmarks(ctx, suite);
    console.log(results);
    await duckdbAsync.terminate();
    await writeReport(results, './benchmark_system_scan_int.json');
}

main();
