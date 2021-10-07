import { benchmarkFormat, benchmarkIterator, benchmarkIteratorAsync } from './internal';
import { runBenchmarks } from './suite';
import Benchmark from 'buffalo-bench/lib';
import { setupDuckDBAsync, setupDuckDBSync } from './setup';

async function main() {
    const duckdbSync = await setupDuckDBSync();
    const duckdbAsync = await setupDuckDBAsync();

    let suite: Benchmark[] = [];
    suite = suite.concat(benchmarkFormat(() => duckdbSync!));
    suite = suite.concat(benchmarkIterator(() => duckdbSync!));
    suite = suite.concat(benchmarkIteratorAsync(() => duckdbAsync!));
    await runBenchmarks(suite);
}

main();
