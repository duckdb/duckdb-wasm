import { writeReport, setupDuckDBSync } from './setup';
import { SystemBenchmarkContext, SystemBenchmark, DuckDBSyncLoadedTPCHBenchmark } from './system';
import { runSystemBenchmarks } from './suite';
import * as path from 'path';

async function main() {
    const baseDir = path.resolve(__dirname, '../../../');
    const duckdbSync = await setupDuckDBSync();

    const duckdbSF01: SystemBenchmark[] = [
        new DuckDBSyncLoadedTPCHBenchmark(duckdbSync, 0.1, 1),
        new DuckDBSyncLoadedTPCHBenchmark(duckdbSync, 0.1, 2),
    ];

    const ctx: SystemBenchmarkContext = {
        projectRootPath: baseDir,
        seed: Math.random(),
    };
    await DuckDBSyncLoadedTPCHBenchmark.beforeGroup(duckdbSync, ctx, 0.1);
    const duckdbSF01Results = await runSystemBenchmarks(ctx, duckdbSF01);
    await DuckDBSyncLoadedTPCHBenchmark.afterGroup(duckdbSync);

    console.log(duckdbSF01Results);
    await writeReport(duckdbSF01Results, './benchmark_system_tpch.json');
}

main();
