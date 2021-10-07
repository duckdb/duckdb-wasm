import { setupDuckDBSync } from './setup';
import {
    ArqueroIntegerJoin3Benchmark,
    DuckDBSyncIntegerJoin3Benchmark,
    SystemBenchmark,
    SystemBenchmarkContext,
} from './system';
import { runSystemBenchmarks } from './suite';
import path from 'path';
import fs from 'fs/promises';

async function main() {
    const duckdbDB = await setupDuckDBSync();

    const ctx: SystemBenchmarkContext = {
        seed: Math.random(),
    };
    const suite: SystemBenchmark[] = [
        new DuckDBSyncIntegerJoin3Benchmark(duckdbDB, 1000, 10000, 100000, 100, 10, 10),
        new ArqueroIntegerJoin3Benchmark(1000, 10000, 100000, 100, 10, 10),
    ];
    const results = await runSystemBenchmarks(ctx, suite);
    console.log(results);

    // Write results
    const reports = path.resolve(__dirname, '../../../reports');
    await fs.mkdir(reports);
    await fs.writeFile(path.resolve(reports, './benchmark_system_join_3.json'), JSON.stringify(results), 'utf8');
}

main();
