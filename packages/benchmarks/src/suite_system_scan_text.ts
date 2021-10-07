import { setupDuckDBSync, writeReport } from './setup';
import {
    SystemBenchmarkContext,
    SystemBenchmark,
    DuckDBSyncVarcharScanBenchmark,
    ArqueroVarcharScanBenchmark,
} from './system';
import { runSystemBenchmarks } from './suite';

async function main() {
    const duckdbSync = await setupDuckDBSync();
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
    const ctx: SystemBenchmarkContext = {
        seed: Math.random(),
    };
    const results = await runSystemBenchmarks(ctx, suite);
    console.log(results);
    await writeReport(results, './benchmark_system_scan_text.json');
}

main();
