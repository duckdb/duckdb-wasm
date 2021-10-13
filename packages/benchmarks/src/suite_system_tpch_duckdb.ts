import { writeReport, setupDuckDBSync } from './setup';
import { SystemBenchmarkContext, SystemBenchmark, DuckDBSyncLoadedTPCHBenchmark } from './system';
import { runSystemBenchmarks } from './suite';
import * as path from 'path';

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('usage: node suite-system-tpch.js <scalefactor>');
        process.exit(-1);
    }
    const sf = parseFloat(args[0]);
    console.log(`Scale Factor ${sf}`);

    const baseDir = path.resolve(__dirname, '../../../');
    const duckdbSync = await setupDuckDBSync();
    const benchmarks: SystemBenchmark[] = [];
    for (let i = 1; i <= 1; ++i) {
        benchmarks.push(new DuckDBSyncLoadedTPCHBenchmark(duckdbSync, sf, i));
    }
    const ctx: SystemBenchmarkContext = {
        projectRootPath: baseDir,
        seed: Math.random(),
    };
    await DuckDBSyncLoadedTPCHBenchmark.beforeGroup(duckdbSync, ctx, sf);
    const results = await runSystemBenchmarks(ctx, benchmarks);
    await DuckDBSyncLoadedTPCHBenchmark.afterGroup(duckdbSync);

    console.log(results);
    await writeReport(results, `./benchmark_system_tpch_${sf.toString().replace('.', '')}_duckdb.json`);
}

main();
