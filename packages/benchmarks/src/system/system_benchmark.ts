import Benchmark from 'buffalo-bench/lib/index';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function noop(_arg0?: any): void {}

export interface SystemBenchmarkContext {
    /// The random seed for all benchmarks
    seed: number;
}

export interface SystemBenchmark {
    /// Get the benchmark name
    getName(): string;
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
        before: async () => bm.beforeAll(ctx),
        beforeEach: async () => bm.beforeEach(ctx),
        after: async () => bm.afterAll(ctx),
        afterEach: async () => bm.afterEach(ctx),
        fn: async () => bm.afterEach(ctx),
    });
}
