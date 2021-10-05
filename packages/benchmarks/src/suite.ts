import Benchmark from 'buffalo-bench/lib';

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
        results.push(bm.toJSON());
    }
    return results;
}
