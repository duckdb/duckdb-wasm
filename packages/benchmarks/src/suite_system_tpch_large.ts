import { writeReport, setupDuckDBSync } from './setup';
import { SystemBenchmarkContext, SystemBenchmark, DuckDBSyncParquetTPCHBenchmark } from './system';
import { runSystemBenchmarks } from './suite';
import * as path from 'path';

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('usage: node suite-system-tpch-large.js <scalefactor>');
        process.exit(-1);
    }
    const sf = parseFloat(args[0]);
    console.log(`Scale Factor ${sf}`);

    const baseDir = path.resolve(__dirname, '../../../');
    const duckdbSync = await setupDuckDBSync();

    const duckdbParquet: SystemBenchmark[] = [];
    for (let i = 0; i < 20; ++i) {
        // XXX check 21, 22
        duckdbParquet.push(new DuckDBSyncParquetTPCHBenchmark(duckdbSync, sf, i + 1));
    }
    const ctx: SystemBenchmarkContext = {
        projectRootPath: baseDir,
        seed: Math.random(),
    };

    await DuckDBSyncParquetTPCHBenchmark.beforeGroup(duckdbSync, ctx, sf);
    const results = await runSystemBenchmarks(ctx, duckdbParquet);
    await DuckDBSyncParquetTPCHBenchmark.afterGroup(duckdbSync);

    console.log(results);
    await writeReport(results, `./benchmark_system_tpch_large_${sf.toString().replace('.', '')}.json`);
}

main();
