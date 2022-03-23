import { benchmarkAM4 } from './internal';
import { runBenchmarks } from './suite';
import Benchmark from 'buffalo-bench/lib';
import { setupDuckDBSync, writeReport } from './setup';

async function main() {
    const duckdbSync = await setupDuckDBSync();

    let suite: Benchmark[] = [];
    suite = suite.concat(benchmarkAM4(() => duckdbSync!));
    const results = await runBenchmarks(suite);
    console.log(results);
    await writeReport(results, './benchmark_am4.json');
}

main();
