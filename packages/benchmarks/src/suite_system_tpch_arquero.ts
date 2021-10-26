import { writeReport } from './setup';
import { SystemBenchmarkContext, SystemBenchmark, ArqueroTPCHBenchmark } from './system';
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
    const benchmarks: SystemBenchmark[] = [];
    for (let i = 1; i <= 22; ++i) {
        if (sf >= 0.1 && (i == 9 || i == 21)) {
            continue;
        }
        benchmarks.push(new ArqueroTPCHBenchmark(sf, i));
    }
    const ctx: SystemBenchmarkContext = {
        projectRootPath: baseDir,
        seed: Math.random(),
    };
    const results = await runSystemBenchmarks(ctx, benchmarks);
    console.log(results);
    await writeReport(results, `./benchmark_system_tpch_${sf.toString().replace('.', '')}_arquero.json`);
}

main();
