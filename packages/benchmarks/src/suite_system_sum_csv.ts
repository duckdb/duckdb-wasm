import { setupDuckDBSync, writeReport } from './setup';
import { ArqueroCSVSumBenchmark, DuckDBSyncCSVSumBenchmark, SystemBenchmark, SystemBenchmarkContext } from './system';
import { runSystemBenchmarks } from './suite';
import * as path from 'path';

async function main() {
    const baseDir = path.resolve(__dirname, '../../../');
    const duckdbSync = await setupDuckDBSync();
    const suite: SystemBenchmark[] = [
        new ArqueroCSVSumBenchmark(1000, 10),
        new ArqueroCSVSumBenchmark(10000, 100),
        new ArqueroCSVSumBenchmark(100000, 1000),
        new ArqueroCSVSumBenchmark(1000000, 10000),
        new DuckDBSyncCSVSumBenchmark(duckdbSync, 1000, 10),
        new DuckDBSyncCSVSumBenchmark(duckdbSync, 10000, 100),
        new DuckDBSyncCSVSumBenchmark(duckdbSync, 100000, 1000),
        new DuckDBSyncCSVSumBenchmark(duckdbSync, 1000000, 10000),
    ];
    const ctx: SystemBenchmarkContext = {
        projectRootPath: baseDir,
        seed: Math.random(),
    };
    const results = await runSystemBenchmarks(ctx, suite);
    console.log(results);
    await writeReport(results, './benchmark_system_sum_csv.json');
}

main();
