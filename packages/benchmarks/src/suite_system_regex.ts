import { setupDuckDBSync, setupSqljs, writeReport } from './setup';
import {
    SystemBenchmarkContext,
    SystemBenchmark,
    SqljsRegexBenchmark,
    ArqueroRegexBenchmark,
    DuckDBSyncRegexBenchmark,
    LovefieldRegexScanBenchmark,
} from './system';
import { runSystemBenchmarks } from './suite';
import * as path from 'path';

async function main() {
    const baseDir = path.resolve(__dirname, '../../../');
    const duckdbSync = await setupDuckDBSync();
    const sqljsDB = await setupSqljs();
    const suite: SystemBenchmark[] = [
        new LovefieldRegexScanBenchmark(1000, 20),
        new LovefieldRegexScanBenchmark(10000, 20),
        new LovefieldRegexScanBenchmark(100000, 20),
        new SqljsRegexBenchmark(sqljsDB, 1000, 20),
        new SqljsRegexBenchmark(sqljsDB, 10000, 20),
        new SqljsRegexBenchmark(sqljsDB, 100000, 20),
        new ArqueroRegexBenchmark(1000, 20),
        new ArqueroRegexBenchmark(10000, 20),
        new ArqueroRegexBenchmark(100000, 20),
        new DuckDBSyncRegexBenchmark(duckdbSync, 1000, 20),
        new DuckDBSyncRegexBenchmark(duckdbSync, 10000, 20),
        new DuckDBSyncRegexBenchmark(duckdbSync, 100000, 20),
    ];
    const ctx: SystemBenchmarkContext = {
        projectRootPath: baseDir,
        seed: Math.random(),
    };
    const results = await runSystemBenchmarks(ctx, suite);
    console.log(results);
    await writeReport(results, './benchmark_system_regex.json');
}

main();
