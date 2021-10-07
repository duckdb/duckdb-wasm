import { setupDuckDBSync, writeReport } from './setup';
import {
    ArqueroIntegerJoin2Benchmark,
    DuckDBSyncIntegerJoin2Benchmark,
    SystemBenchmark,
    SystemBenchmarkContext,
} from './system';
import { runSystemBenchmarks } from './suite';

async function main() {
    const duckdbSync = await setupDuckDBSync();
    const suite: SystemBenchmark[] = [
        new ArqueroIntegerJoin2Benchmark(1000, 10000, 100, 10),
        new ArqueroIntegerJoin2Benchmark(10000, 100000, 100, 10),
        new ArqueroIntegerJoin2Benchmark(100000, 100000, 100, 10),
        new ArqueroIntegerJoin2Benchmark(100000, 1000000, 100, 10),
        new DuckDBSyncIntegerJoin2Benchmark(duckdbSync, 1000, 10000, 100, 10),
        new DuckDBSyncIntegerJoin2Benchmark(duckdbSync, 10000, 100000, 100, 10),
        new DuckDBSyncIntegerJoin2Benchmark(duckdbSync, 100000, 100000, 100, 10),
        new DuckDBSyncIntegerJoin2Benchmark(duckdbSync, 100000, 1000000, 100, 10),
    ];
    const ctx: SystemBenchmarkContext = {
        seed: Math.random(),
    };
    const results = await runSystemBenchmarks(ctx, suite);
    await writeReport(results, './benchmark_system_join_2.json');
}

main();
