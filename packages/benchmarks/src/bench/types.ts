import { Suite } from 'benchmark';

export type SuiteModifier = (suite: Suite) => Suite;
export type AsyncSuiteModifier = Promise<SuiteModifier>;

export interface Options {
    /// The delay between test cycles (secs).
    /// Default: 0.005
    delay?: number;
    /// The default number of times to execute a test on a benchmark's first cycle.
    /// Default: 1
    initCount?: number;
    /// The time needed to reduce the percent uncertainty of measurement to 1% (secs).
    /// Default: 0
    minTime?: number;
    /// The maximum time a benchmark is allowed to run before finishing (secs).
    /// Note: Cycle delays aren't counted toward the maximum time.
    /// Default: 5
    maxTime?: number;
    /// The minimum sample size required to perform statistical analysis.
    /// Default: 5
    minSamples?: number;
}

export interface CaseResult {
    /// The name of the benchmark case
    name: string;
    /// Operations per second
    ops: number;
    /// The relative margin of error, as a percentage of the mean.
    margin: number;
    /// Options with which benchmark was executed
    options: Options;
    /// The number of samples executed
    samples: number;
    /// True, if benchmark runs async code
    promise: boolean;
    /// The detailed statistics of the benchmark
    details: {
        /// The slowest sample time (in seconds)
        min: number;
        /// The fastest sample time (in seconds)
        max: number;
        /// The arithmetical mean (in seconds)
        mean: number;
        /// Median (in seconds)
        median: number;
        /// Standard deviation (in seconds)
        standardDeviation: number;
        /// Margin of error.
        /// a.k.a standardErrorOfMean corrected by critical value
        marginOfError: number;
        /// The elative margin of error,
        /// as a percentage of the mean.
        relativeMarginOfError: number;
        /// The standard error of the mean,
        /// (a.k.a. the standard deviation of the sampling distribution of the sample mean)
        standardErrorOfMean: number;
        /// The sample variance
        sampleVariance: number;
        /// An array of executed samples times (in seconds)
        sampleResults: number[];
    };
    /// True if benchmark was completed
    completed: boolean;
}

export type CaseResultWithDiff = CaseResult & { percentSlower: number };

export interface Summary {
    name: string;
    date: Date;
    results: CaseResultWithDiff[];
    fastest: {
        name: string;
        index: number;
    };
    slowest: {
        name: string;
        index: number;
    };
}

export interface Target {
    name: string;
    hz: number;
    stats: {
        rme: number;
        sample: number[];
        mean: number;
        deviation: number;
        moe: number;
        sem: number;
        variance: number;
    };
    delay: number;
    initCount: number;
    minTime: number;
    maxTime: number;
    minSamples: number;
    defer: boolean;
}
