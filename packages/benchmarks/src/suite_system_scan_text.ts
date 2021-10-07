import { setupDuckDBSync } from './setup';
import {
    SystemBenchmarkContext,
    SystemBenchmark,
    DuckDBSyncVarcharScanBenchmark,
    ArqueroVarcharScanBenchmark,
} from './system';
import { runSystemBenchmarks } from './suite';
import path from 'path';
import fs from 'fs/promises';

async function main() {
    const duckdbSync = await setupDuckDBSync();

    const ctx: SystemBenchmarkContext = {
        seed: Math.random(),
    };
    const suite: SystemBenchmark[] = [
        new ArqueroVarcharScanBenchmark(1000, 20),
        new ArqueroVarcharScanBenchmark(10000, 20),
        new ArqueroVarcharScanBenchmark(100000, 20),
        new ArqueroVarcharScanBenchmark(1000000, 20),
        new DuckDBSyncVarcharScanBenchmark(duckdbSync, 1000, 20),
        new DuckDBSyncVarcharScanBenchmark(duckdbSync, 10000, 20),
        new DuckDBSyncVarcharScanBenchmark(duckdbSync, 100000, 20),
        new DuckDBSyncVarcharScanBenchmark(duckdbSync, 1000000, 20),
    ];
    const results = await runSystemBenchmarks(ctx, suite);
    console.log(results);

    // Write results
    const reports = path.resolve(__dirname, '../../../reports');
    await fs.mkdir(reports);
    await fs.writeFile(path.resolve(__dirname, './benchmark_system_scan_text.json'), JSON.stringify(results), 'utf8');
}

main();
