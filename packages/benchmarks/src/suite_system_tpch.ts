import { writeReport, setupDuckDBSync } from './setup';
import {
    SystemBenchmarkContext,
    SystemBenchmark,
    DuckDBSyncLoadedTPCHBenchmark,
    DuckDBSyncParquetTPCHBenchmark,
} from './system';
import { JsonBenchmark, runSystemBenchmarks } from './suite';
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

    const duckdbLoadedSF01: SystemBenchmark[] = [
        new DuckDBSyncLoadedTPCHBenchmark(duckdbSync, sf, 1),
        new DuckDBSyncLoadedTPCHBenchmark(duckdbSync, sf, 2),
    ];
    const duckdbParquetSF01: SystemBenchmark[] = [
        new DuckDBSyncParquetTPCHBenchmark(duckdbSync, sf, 1),
        new DuckDBSyncParquetTPCHBenchmark(duckdbSync, sf, 2),
    ];

    const ctx: SystemBenchmarkContext = {
        projectRootPath: baseDir,
        seed: Math.random(),
    };

    await DuckDBSyncLoadedTPCHBenchmark.beforeGroup(duckdbSync, ctx, sf);
    const r1 = await runSystemBenchmarks(ctx, duckdbLoadedSF01);
    await DuckDBSyncLoadedTPCHBenchmark.afterGroup(duckdbSync);

    await DuckDBSyncParquetTPCHBenchmark.beforeGroup(duckdbSync, ctx, sf);
    const r2 = await runSystemBenchmarks(ctx, duckdbParquetSF01);
    await DuckDBSyncParquetTPCHBenchmark.afterGroup(duckdbSync);

    let results: JsonBenchmark[] = [];
    results = results.concat(r1);
    results = results.concat(r2);
    console.log(results);
    await writeReport(results, `./benchmark_system_tpch_${sf.toString().replace('.', '')}.json`);
}

main();
