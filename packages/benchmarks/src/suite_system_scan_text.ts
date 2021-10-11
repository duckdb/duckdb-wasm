import { setupDuckDBSync, setupSqljs, writeReport } from './setup';
import {
    SystemBenchmarkContext,
    SystemBenchmark,
    DuckDBSyncVarcharScanBenchmark,
    SqljsVarcharScanBenchmark,
    ArqueroVarcharScanBenchmark,
} from './system';
import { runSystemBenchmarks } from './suite';
import * as path from 'path';

async function main() {
    const baseDir = path.resolve(__dirname, '../../../');
    const duckdbSync = await setupDuckDBSync();
    const sqljsDB = await setupSqljs();
    const suite: SystemBenchmark[] = [
        new SqljsVarcharScanBenchmark(sqljsDB, 1000, 20),
        new SqljsVarcharScanBenchmark(sqljsDB, 10000, 20),
        new SqljsVarcharScanBenchmark(sqljsDB, 100000, 20),
        new ArqueroVarcharScanBenchmark(1000, 20),
        new ArqueroVarcharScanBenchmark(10000, 20),
        new ArqueroVarcharScanBenchmark(100000, 20),
        new DuckDBSyncVarcharScanBenchmark(duckdbSync, 1000, 20),
        new DuckDBSyncVarcharScanBenchmark(duckdbSync, 10000, 20),
        new DuckDBSyncVarcharScanBenchmark(duckdbSync, 100000, 20),
    ];
    const ctx: SystemBenchmarkContext = {
        projectRootPath: baseDir,
        seed: Math.random(),
    };
    const results = await runSystemBenchmarks(ctx, suite);
    console.log(results);
    await writeReport(results, './benchmark_system_scan_text.json');
}

main();
