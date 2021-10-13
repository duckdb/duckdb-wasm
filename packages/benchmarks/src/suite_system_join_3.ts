import { setupDuckDBSync, setupSqljs, writeReport } from './setup';
import {
    ArqueroIntegerJoin3Benchmark,
    DuckDBSyncIntegerJoin3Benchmark,
    LovefieldIntegerJoin3Benchmark,
    SqljsIntegerJoin3Benchmark,
    SystemBenchmark,
    SystemBenchmarkContext,
} from './system';
import { runSystemBenchmarks } from './suite';
import * as path from 'path';

async function main() {
    const baseDir = path.resolve(__dirname, '../../../');
    const duckdbSync = await setupDuckDBSync();
    const sqljsDB = await setupSqljs();
    const suite: SystemBenchmark[] = [
        new LovefieldIntegerJoin3Benchmark(10, 100, 1000, 10, 10, 10),
        new LovefieldIntegerJoin3Benchmark(100, 1000, 10000, 100, 10, 10),
        new LovefieldIntegerJoin3Benchmark(1000, 10000, 100000, 100, 10, 10),
        new LovefieldIntegerJoin3Benchmark(10000, 100000, 1000000, 100, 10, 10),
        new SqljsIntegerJoin3Benchmark(sqljsDB, 10, 100, 1000, 10, 10, 10),
        new SqljsIntegerJoin3Benchmark(sqljsDB, 100, 1000, 10000, 100, 10, 10),
        new SqljsIntegerJoin3Benchmark(sqljsDB, 1000, 10000, 100000, 100, 10, 10),
        new SqljsIntegerJoin3Benchmark(sqljsDB, 10000, 100000, 1000000, 100, 10, 10),
        new ArqueroIntegerJoin3Benchmark(10, 100, 1000, 10, 10, 10),
        new ArqueroIntegerJoin3Benchmark(100, 1000, 10000, 100, 10, 10),
        new ArqueroIntegerJoin3Benchmark(1000, 10000, 100000, 100, 10, 10),
        new ArqueroIntegerJoin3Benchmark(10000, 100000, 1000000, 100, 10, 10),
        new DuckDBSyncIntegerJoin3Benchmark(duckdbSync, 10, 100, 1000, 10, 10, 10),
        new DuckDBSyncIntegerJoin3Benchmark(duckdbSync, 100, 1000, 10000, 100, 10, 10),
        new DuckDBSyncIntegerJoin3Benchmark(duckdbSync, 1000, 10000, 100000, 100, 10, 10),
        new DuckDBSyncIntegerJoin3Benchmark(duckdbSync, 10000, 100000, 1000000, 100, 10, 10),
    ];
    const ctx: SystemBenchmarkContext = {
        projectRootPath: baseDir,
        seed: Math.random(),
    };
    const results = await runSystemBenchmarks(ctx, suite);
    console.log(results);
    await writeReport(results, './benchmark_system_join_3.json');
}

main();
