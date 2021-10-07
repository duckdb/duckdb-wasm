import { setupDuckDBSync } from './setup';
import { SystemBenchmarkContext, SystemBenchmark, ArqueroRegexBenchmark, DuckDBSyncRegexBenchmark } from './system';
import { runSystemBenchmarks } from './suite';
import path from 'path';
import fs from 'fs/promises';

async function main() {
    const duckdbDB = await setupDuckDBSync();

    const ctx: SystemBenchmarkContext = {
        seed: Math.random(),
    };
    const suite: SystemBenchmark[] = [
        new DuckDBSyncRegexBenchmark(duckdbDB, 1000, 20),
        new DuckDBSyncRegexBenchmark(duckdbDB, 10000, 20),
        new DuckDBSyncRegexBenchmark(duckdbDB, 100000, 20),
        new ArqueroRegexBenchmark(1000, 20),
        new ArqueroRegexBenchmark(10000, 20),
        new ArqueroRegexBenchmark(100000, 20),
    ];
    const results = await runSystemBenchmarks(ctx, suite);
    console.log(results);

    // Write results
    const reports = path.resolve(__dirname, '../../../reports');
    await fs.mkdir(reports);
    await fs.writeFile(path.resolve(reports, './benchmark_system_regex.json'), JSON.stringify(results), 'utf8');
}

main();
