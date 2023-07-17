import { Benchmark } from 'buffalo-bench';
import { createSystemBenchmark, SystemBenchmark, SystemBenchmarkContext } from './system';

export interface JsonBenchmark {
    name: string;
    errorMessage?: string;
    cycles: number;
    hz: number;
    meanTime: number;
    medianTime: number;
    standardDeviation: number;
    maxTime: number;
    minTime: number;
    runTime: number;
    totalTime: number;
    samples: number;
}

export async function runBenchmarks(benchmarks: Benchmark[]): Promise<JsonBenchmark[]> {
    const results: JsonBenchmark[] = [];
    for (const bm of benchmarks) {
        console.log(`[ RUN ] ${bm.name}`);
        await bm.run();
        console.log(`[ OK  ] ${bm.name}`);
        results.push({
            ...bm.toJSON(),
        });
    }
    return results;
}

export async function runSystemBenchmarks(
    ctx: SystemBenchmarkContext,
    benchmarks: SystemBenchmark[],
): Promise<JsonBenchmark[]> {
    const bms = benchmarks.map(bm => ({
        bench: createSystemBenchmark(ctx, bm),
        meta: bm.getMetadata(),
    }));
    const results: JsonBenchmark[] = [];
    for (const bm of bms) {
        console.log(`[ RUN ] ${bm.bench.name}`);
        await bm.bench.run();
        console.log(`[ OK  ] ${bm.bench.name}${' '.repeat(Math.max(40 - bm.bench.name.length, 0))}`);
        results.push({
            ...bm.meta,
            ...bm.bench.toJSON(),
        });
    }
    return results;
}
