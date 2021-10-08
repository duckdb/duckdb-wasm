import { setupDuckDBSync, writeReport } from './setup';
import { SystemBenchmarkContext, SystemBenchmark, ArqueroRegexBenchmark, DuckDBSyncRegexBenchmark } from './system';
import { runSystemBenchmarks } from './suite';
import * as path from 'path';

async function main() {
    const baseDir = path.resolve(__dirname, '../../../');
    const duckdbSync = await setupDuckDBSync();
    const suite: SystemBenchmark[] = [
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
