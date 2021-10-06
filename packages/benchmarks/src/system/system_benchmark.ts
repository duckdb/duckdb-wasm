import Benchmark from 'buffalo-bench/lib';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function noop(_arg0?: any): void {}

export interface SystemBenchmarkContext {
    /// The random seed for all benchmarks
    seed: number;
}

export interface SystemBenchmarkMetadata {
    benchmark: string;
    system: string;
    tags: string[];
    timestamp: Date;
    parameters: any[];
    throughputTuples?: number;
    throughputBytes?: number;
}

export interface SystemBenchmark {
    /// Get the benchmark name
    getName(): string;
    /// Get benchmark metadata
    getMetadata(): SystemBenchmarkMetadata;
    /// Executed on error
    onError(ctx: SystemBenchmarkContext): Promise<void>;
    /// Executed before all benchmarks are run.
    beforeAll(ctx: SystemBenchmarkContext): Promise<void>;
    /// Executed before a benchmark is run.
    beforeEach(ctx: SystemBenchmarkContext): Promise<void>;
    /// Run a benchmark
    run(ctx: SystemBenchmarkContext): Promise<void>;
    /// Executed after a benchmark is run.
    afterEach(ctx: SystemBenchmarkContext): Promise<void>;
    /// Executed after all benchmarks are run.
    afterAll(ctx: SystemBenchmarkContext): Promise<void>;
}

/// Creat a system benchmark
export function createSystemBenchmark(ctx: SystemBenchmarkContext, bm: SystemBenchmark): Benchmark {
    return new Benchmark(bm.getName(), {
        maxTime: 5,
        minSamples: 1,
        before: async () => await bm.beforeAll(ctx),
        beforeEach: async () => await bm.beforeEach(ctx),
        after: async () => await bm.afterAll(ctx),
        afterEach: async () => await bm.afterEach(ctx),
        fn: async () => await bm.run(ctx),
    });
}
