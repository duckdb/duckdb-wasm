export type Options = {
  /**
   * The delay between test cycles (secs).
   *
   * @default 0.005
   */
  delay?: number

  /**
   * The default number of times to execute a test on a benchmark's first cycle.
   *
   * @default 1
   */
  initCount?: number

  /**
   * The time needed to reduce the percent uncertainty of measurement to 1% (secs).
   *
   * @default 0
   */
  minTime?: number

  /**
   * The maximum time a benchmark is allowed to run before finishing (secs).
   *
   * Note: Cycle delays aren't counted toward the maximum time.
   *
   * @default 5
   */
  maxTime?: number

  /**
   * The minimum sample size required to perform statistical analysis.
   *
   * @default 5
   */
  minSamples?: number
}

export type SaveOptions = {
  /**
   * File name or function that takes case timestamp and produces file name
   *
   * @default '<ISO_DATE_TIME>.json'
   */
  file?: string | ((summary: Summary) => string)
  /**
   * Destination folder fo for results file
   *
   * Note: will be created if not exists
   *
   * @default 'benchmark/results'
   */
  folder?: string
  /**
   * Suite version - will be added to the results file content
   *
   * @default null
   */
  version?: string | null
  /**
   * Suite version - will be added to the results file content
   *
   * @default false
   */
  details?: boolean
  /**
   * Suite version - will be added to the results file content
   *
   * @default 'json'
   */
  format?: 'json' | 'csv' | 'table.html' | 'chart.html'
}

export type CaseResult = {
  /**
   * The name of the benchmark case
   */
  name: string
  /**
   * Operations per second
   */
  ops: number
  /**
   * The relative margin of error,
   * as a percentage of the mean.
   *
   * @see details.relativeMarginOfError
   */
  margin: number
  /**
   * Options with which benchmark was executed
   */
  options: Options
  /**
   * The number of samples executed
   */
  samples: number
  /**
   * True, if benchmark runs async code
   */
  promise: boolean
  /**
   * The detailed statistics of the benchmark
   */
  details: {
    /**
     * The slowest sample time (in seconds)
     */
    min: number
    /**
     * The fastest sample time (in seconds)
     */
    max: number
    /**
     * The arithmetical mean (in seconds)
     */
    mean: number
    /**
     * Median (in seconds)
     */
    median: number
    /**
     * Standard deviation (in seconds)
     */
    standardDeviation: number
    /**
     * Margin of error.
     * a.k.a standardErrorOfMean corrected by critical value
     */
    marginOfError: number
    /**
     * The elative margin of error,
     * as a percentage of the mean.
     */
    relativeMarginOfError: number
    /**
     * The standard error of the mean,
     * (a.k.a. the standard deviation of the sampling distribution of the sample mean)
     */
    standardErrorOfMean: number
    /**
     * The sample variance
     */
    sampleVariance: number
    /**
     * An array of executed samples times (in seconds)
     */
    sampleResults: number[]
  }
  /**
   * True if benchmark was completed
   */
  completed: boolean
}

export type CaseResultWithDiff = CaseResult & { percentSlower: number }

export type Summary = {
  name: string
  date: Date
  results: CaseResultWithDiff[]
  fastest: {
    name: string
    index: number
  }
  slowest: {
    name: string
    index: number
  }
}

export type CSVEntry = {
  name: string
  ops: number
  margin: number
  percentSlower: number
  samples: number
  promise: boolean
  min: number
  max: number
  mean: number
  median: number
  standardDeviation: number
  marginOfError: number
  relativeMarginOfError: number
  standardErrorOfMean: number
  sampleVariance: number
}

export type Target = {
  name: string
  hz: number
  stats: {
    rme: number
    sample: number[]
    mean: number
    deviation: number
    moe: number
    sem: number
    variance: number
  }
  delay: number
  initCount: number
  minTime: number
  maxTime: number
  minSamples: number
  defer: boolean
}

export type CSVContent = CSVEntry[]
