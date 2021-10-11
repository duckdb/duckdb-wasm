import { setupDuckDBSync, setupSqljs, writeReport } from './setup';
import {
    ArqueroIntegerJoin2Benchmark,
    DuckDBSyncIntegerJoin2Benchmark,
    SqljsIntegerJoin2Benchmark,
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
        new SqljsIntegerJoin2Benchmark(sqljsDB, 1000, 10000, 100, 10),
        new SqljsIntegerJoin2Benchmark(sqljsDB, 10000, 100000, 100, 10),
        new SqljsIntegerJoin2Benchmark(sqljsDB, 100000, 100000, 100, 10),
        new SqljsIntegerJoin2Benchmark(sqljsDB, 100000, 1000000, 100, 10),
        new ArqueroIntegerJoin2Benchmark(1000, 10000, 100, 10),
        new ArqueroIntegerJoin2Benchmark(10000, 100000, 100, 10),
        new ArqueroIntegerJoin2Benchmark(100000, 100000, 100, 10),
        new ArqueroIntegerJoin2Benchmark(100000, 1000000, 100, 10),
        new DuckDBSyncIntegerJoin2Benchmark(duckdbSync, 1000, 10000, 100, 10),
        new DuckDBSyncIntegerJoin2Benchmark(duckdbSync, 10000, 100000, 100, 10),
        new DuckDBSyncIntegerJoin2Benchmark(duckdbSync, 100000, 100000, 100, 10),
        new DuckDBSyncIntegerJoin2Benchmark(duckdbSync, 100000, 1000000, 100, 10),
    ];
    const ctx: SystemBenchmarkContext = {
        projectRootPath: baseDir,
        seed: Math.random(),
    };
    const results = await runSystemBenchmarks(ctx, suite);
    console.log(results);
    await writeReport(results, './benchmark_system_join_2.json');
}

main();
