import { setupDuckDBSync, writeReport } from './setup';
import { ArqueroCSVSumBenchmark, DuckDBSyncCSVSumBenchmark, SystemBenchmark, SystemBenchmarkContext } from './system';
import { runSystemBenchmarks } from './suite';

async function main() {
    const duckdbSync = await setupDuckDBSync();
    const ctx: SystemBenchmarkContext = {
        seed: Math.random(),
    };
    const suite: SystemBenchmark[] = [
        new DuckDBSyncCSVSumBenchmark(duckdbSync, 1000, 10),
        new DuckDBSyncCSVSumBenchmark(duckdbSync, 10000, 100),
        new DuckDBSyncCSVSumBenchmark(duckdbSync, 100000, 1000),
        new DuckDBSyncCSVSumBenchmark(duckdbSync, 1000000, 10000),
        new ArqueroCSVSumBenchmark(1000, 10),
        new ArqueroCSVSumBenchmark(10000, 100),
        new ArqueroCSVSumBenchmark(100000, 1000),
        new ArqueroCSVSumBenchmark(1000000, 10000),
    ];
    const results = await runSystemBenchmarks(ctx, suite);
    console.log(results);
    await writeReport(results, './benchmark_system_sum_csv.json');
}

main();
