import { setupDuckDBSync } from './setup';
import { DuckDBSyncIntegerSumBenchmark, SystemBenchmark, SystemBenchmarkContext } from './system';
import { runSystemBenchmarks } from './suite';
import path from 'path';
import fs from 'fs/promises';

async function main() {
    const duckdbSync = await setupDuckDBSync();

    const ctx: SystemBenchmarkContext = {
        seed: Math.random(),
    };
    const suite: SystemBenchmark[] = [
        new DuckDBSyncIntegerSumBenchmark(duckdbSync, 1000, 10),
        new DuckDBSyncIntegerSumBenchmark(duckdbSync, 10000, 10),
        new DuckDBSyncIntegerSumBenchmark(duckdbSync, 100000, 10),
    ];
    const results = await runSystemBenchmarks(ctx, suite);
    console.log(results);

    // Write results
    const reports = path.resolve(__dirname, '../../../reports');
    await fs.mkdir(reports);
    await fs.writeFile(path.resolve(__dirname, './benchmark_system_scan_int.json'), JSON.stringify(results), 'utf8');
}

main();
