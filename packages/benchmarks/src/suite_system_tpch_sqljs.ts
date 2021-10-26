import { writeReport, setupSqljs } from './setup';
import { SystemBenchmarkContext, SystemBenchmark, SqljsTPCHBenchmark } from './system';
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
    const sqljsDB = await setupSqljs();
    const benchmarks: SystemBenchmark[] = [];
    for (let i = 1; i <= 22; ++i) {
        if (sf >= 0.25 && (i == 17 || i == 20 || i == 22)) {
            continue;
        }
        benchmarks.push(new SqljsTPCHBenchmark(sf, i));
    }
    const ctx: SystemBenchmarkContext = {
        projectRootPath: baseDir,
        seed: Math.random(),
    };
    await SqljsTPCHBenchmark.beforeGroup(sqljsDB, ctx, sf);
    const results = await runSystemBenchmarks(ctx, benchmarks);
    await SqljsTPCHBenchmark.afterGroup();

    console.log(results);
    await writeReport(results, `./benchmark_system_tpch_${sf.toString().replace('.', '')}_sqljs.json`);
}

main();
