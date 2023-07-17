import { benchmarkUDF, benchmarkFormat, benchmarkIterator, benchmarkIteratorAsync } from './internal';
import { runBenchmarks } from './suite';
import { Benchmark } from 'buffalo-bench';
import { setupDuckDBAsync, setupDuckDBSync, writeReport } from './setup';

async function main() {
    const duckdbSync = await setupDuckDBSync();
    const duckdbAsync = await setupDuckDBAsync();

    let suite: Benchmark[] = [];
    suite = suite.concat(benchmarkUDF(() => duckdbSync!));
    suite = suite.concat(benchmarkFormat(() => duckdbSync!));
    suite = suite.concat(benchmarkFormat(() => duckdbSync!));
    suite = suite.concat(benchmarkIterator(() => duckdbSync!));
    suite = suite.concat(benchmarkIteratorAsync(() => duckdbAsync!));
    const results = await runBenchmarks(suite);
    console.log(results);
    await writeReport(results, './benchmark_internal.json');
}

main();
