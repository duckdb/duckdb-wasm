import { setupDuckDBSync, setupSqljs, writeReport } from './setup';
import {
    SystemBenchmarkContext,
    SystemBenchmark,
    ArqueroIntegerSortBenchmark,
    DuckDBSyncIntegerSortBenchmark,
    DuckDBSyncIntegerTopKBenchmark,
    ArqueroIntegerTopKBenchmark,
    SqljsIntegerSortBenchmark,
    SqljsIntegerTopKBenchmark,
    LovefieldIntegerSortBenchmark,
    LovefieldIntegerTopKBenchmark,
} from './system';
import { runSystemBenchmarks } from './suite';
import * as path from 'path';

async function main() {
    const baseDir = path.resolve(__dirname, '../../../');
    const duckdbSync = await setupDuckDBSync();
    const sqljsDB = await setupSqljs();
    const suite: SystemBenchmark[] = [
        new LovefieldIntegerSortBenchmark(1000, 1, 1),
        new LovefieldIntegerSortBenchmark(10000, 1, 1),
        new LovefieldIntegerSortBenchmark(100000, 1, 1),
        new LovefieldIntegerSortBenchmark(1000, 2, 2),
        new LovefieldIntegerSortBenchmark(10000, 2, 2),
        new LovefieldIntegerSortBenchmark(100000, 2, 2),
        new LovefieldIntegerTopKBenchmark(1000, 1, 1, 100),
        new LovefieldIntegerTopKBenchmark(10000, 1, 1, 100),
        new LovefieldIntegerTopKBenchmark(100000, 1, 1, 100),
        new SqljsIntegerSortBenchmark(sqljsDB, 1000, 1, 1),
        new SqljsIntegerSortBenchmark(sqljsDB, 10000, 1, 1),
        new SqljsIntegerSortBenchmark(sqljsDB, 100000, 1, 1),
        new SqljsIntegerSortBenchmark(sqljsDB, 1000, 2, 2),
        new SqljsIntegerSortBenchmark(sqljsDB, 10000, 2, 2),
        new SqljsIntegerSortBenchmark(sqljsDB, 100000, 2, 2),
        new SqljsIntegerTopKBenchmark(sqljsDB, 1000, 1, 1, 100),
        new SqljsIntegerTopKBenchmark(sqljsDB, 10000, 1, 1, 100),
        new SqljsIntegerTopKBenchmark(sqljsDB, 100000, 1, 1, 100),
        new ArqueroIntegerSortBenchmark(1000, 1, 1),
        new ArqueroIntegerSortBenchmark(10000, 1, 1),
        new ArqueroIntegerSortBenchmark(100000, 1, 1),
        new ArqueroIntegerSortBenchmark(1000, 2, 2),
        new ArqueroIntegerSortBenchmark(10000, 2, 2),
        new ArqueroIntegerSortBenchmark(100000, 2, 2),
        new ArqueroIntegerTopKBenchmark(1000, 1, 1, 100),
        new ArqueroIntegerTopKBenchmark(10000, 1, 1, 100),
        new ArqueroIntegerTopKBenchmark(100000, 1, 1, 100),
        new DuckDBSyncIntegerSortBenchmark(duckdbSync, 1000, 1, 1),
        new DuckDBSyncIntegerSortBenchmark(duckdbSync, 10000, 1, 1),
        new DuckDBSyncIntegerSortBenchmark(duckdbSync, 100000, 1, 1),
        new DuckDBSyncIntegerSortBenchmark(duckdbSync, 1000, 2, 2),
        new DuckDBSyncIntegerSortBenchmark(duckdbSync, 10000, 2, 2),
        new DuckDBSyncIntegerSortBenchmark(duckdbSync, 100000, 2, 2),
        new DuckDBSyncIntegerTopKBenchmark(duckdbSync, 1000, 1, 1, 100),
        new DuckDBSyncIntegerTopKBenchmark(duckdbSync, 10000, 1, 1, 100),
        new DuckDBSyncIntegerTopKBenchmark(duckdbSync, 100000, 1, 1, 100),
    ];
    const ctx: SystemBenchmarkContext = {
        projectRootPath: baseDir,
        seed: Math.random(),
    };
    const results = await runSystemBenchmarks(ctx, suite);
    console.log(results);
    await writeReport(results, './benchmark_system_sort_int.json');
}

main();
