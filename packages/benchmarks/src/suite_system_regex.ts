import { setupDuckDBSync, writeReport } from './setup';
import { SystemBenchmarkContext, SystemBenchmark, ArqueroRegexBenchmark, DuckDBSyncRegexBenchmark } from './system';
import { runSystemBenchmarks } from './suite';

async function main() {
    const duckdbDB = await setupDuckDBSync();
    const ctx: SystemBenchmarkContext = {
        seed: Math.random(),
    };
    const suite: SystemBenchmark[] = [
        new ArqueroRegexBenchmark(1000, 20),
        new ArqueroRegexBenchmark(10000, 20),
        new ArqueroRegexBenchmark(100000, 20),
        new DuckDBSyncRegexBenchmark(duckdbDB, 1000, 20),
        new DuckDBSyncRegexBenchmark(duckdbDB, 10000, 20),
        new DuckDBSyncRegexBenchmark(duckdbDB, 100000, 20),
    ];
    const results = await runSystemBenchmarks(ctx, suite);
    console.log(results);
    await writeReport(results, './benchmark_system_regex.json');
}

main();
