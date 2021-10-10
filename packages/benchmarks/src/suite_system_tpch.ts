import { writeReport, setupDuckDBSync, setupSqljs } from './setup';
import {
    SystemBenchmarkContext,
    SystemBenchmark,
    DuckDBSyncLoadedTPCHBenchmark,
    SqljsTPCHBenchmark,
    ArqueroTPCHBenchmark,
} from './system';
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
    const sqljsDB = await setupSqljs();

    const benchArquero: SystemBenchmark[] = [];
    const benchSQLjs: SystemBenchmark[] = [];
    const benchDuckDB: SystemBenchmark[] = [];
    for (let i = 1; i <= 22; ++i) {
        benchArquero.push(new ArqueroTPCHBenchmark(sf, i));
        benchSQLjs.push(new SqljsTPCHBenchmark(sqljsDB, sf, i));
        benchDuckDB.push(new DuckDBSyncLoadedTPCHBenchmark(duckdbSync, sf, i));
    }

    const ctx: SystemBenchmarkContext = {
        projectRootPath: baseDir,
        seed: Math.random(),
    };

    const resultsArquero = await runSystemBenchmarks(ctx, benchArquero);
    const resultsSQLjs = await runSystemBenchmarks(ctx, benchArquero);
    await DuckDBSyncLoadedTPCHBenchmark.beforeGroup(duckdbSync, ctx, sf);
    const resultsDuckDB = await runSystemBenchmarks(ctx, benchDuckDB);
    await DuckDBSyncLoadedTPCHBenchmark.afterGroup(duckdbSync);

    const results = resultsArquero.concat(resultsSQLjs).concat(resultsDuckDB);
    console.log(results);
    await writeReport(results, `./benchmark_system_tpch_${sf.toString().replace('.', '')}.json`);
}

main();
