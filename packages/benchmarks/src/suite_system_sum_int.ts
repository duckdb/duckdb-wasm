import { setupDuckDBSync, setupSqljs, writeReport } from './setup';
import {
    DuckDBSyncIntegerSumBenchmark,
    ArqueroIntegerSumBenchmark,
    SystemBenchmark,
    SystemBenchmarkContext,
    SqljsIntegerSumBenchmark,
    LovefieldIntegerSumBenchmark,
} from './system';
import { runSystemBenchmarks } from './suite';
import * as path from 'path';

async function main() {
    const baseDir = path.resolve(__dirname, '../../../');
    const duckdbSync = await setupDuckDBSync();
    const sqljsDB = await setupSqljs();
    const suite: SystemBenchmark[] = [
        new LovefieldIntegerSumBenchmark(1000, 10),
        new LovefieldIntegerSumBenchmark(10000, 10),
        new LovefieldIntegerSumBenchmark(100000, 10),
 //       new LovefieldIntegerSumBenchmark(1000000, 10),
        new SqljsIntegerSumBenchmark(sqljsDB, 1000, 10),
        new SqljsIntegerSumBenchmark(sqljsDB, 10000, 10),
        new SqljsIntegerSumBenchmark(sqljsDB, 100000, 10),
 //       new SqljsIntegerSumBenchmark(sqljsDB, 1000000, 10),
        new ArqueroIntegerSumBenchmark(1000, 10),
        new ArqueroIntegerSumBenchmark(10000, 10),
        new ArqueroIntegerSumBenchmark(100000, 10),
//        new ArqueroIntegerSumBenchmark(1000000, 10),
        new DuckDBSyncIntegerSumBenchmark(duckdbSync, 1000, 10),
        new DuckDBSyncIntegerSumBenchmark(duckdbSync, 10000, 10),
        new DuckDBSyncIntegerSumBenchmark(duckdbSync, 100000, 10),
//        new DuckDBSyncIntegerSumBenchmark(duckdbSync, 1000000, 10),
    ];
    const ctx: SystemBenchmarkContext = {
        projectRootPath: baseDir,
        seed: Math.random(),
    };
    const results = await runSystemBenchmarks(ctx, suite);
    console.log(results);
    await writeReport(results, './benchmark_system_sum_int.json');
}

main();
