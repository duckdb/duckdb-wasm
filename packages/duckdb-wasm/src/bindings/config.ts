export interface DuckDBQueryConfig {
    /**
     * The polling interval for queries
     */
    queryPollingInterval?: number;
    /**
     * Cast BigInt to Double?
     */
    castBigIntToDouble?: boolean;
    /**
     * Cast Timestamp to Date64?
     */
    castTimestampToDate?: boolean;
    /**
     * Cast Timestamp to Date64?
     */
    castDurationToTime64?: boolean;
    /**
     * Cast Decimal to Double?
     */
    castDecimalToDouble?: boolean;
}

export interface DuckDBFilesystemConfig {
    reliableHeadRequests?: boolean;
    /**
     * Allow falling back to full HTTP reads if the server does not support range requests.
     */
    allowFullHTTPReads?: boolean;
    /**
     * Force use of full HTTP reads, suppressing range requests.
     */
    forceFullHTTPReads?: boolean;
}

export interface DuckDBOPFSConfig {
    /**
     * Defines how `opfs://` files are handled during SQL execution.
     * - "auto": Automatically register `opfs://` files and drop them after execution.
     * - "manual": Files must be manually registered and dropped.
     */
    fileHandling?: "auto" | "manual";

    /**
     * OPFS path for temporary files (e.g., "opfs://tmp").
     *
     * When set, a "pool" of pre-allocated temp files is maintained for use by
     * DuckDB when it opens a tempfile on-demand. Pre-allocation of tempfiles is
     * required when using OPFS due to the OPFS API providing only asynchronous
     * file creation, while DuckDB's temp file creation must be synchronous. By
     * maintaining a pool of pre-created temp files, DuckDB can synchronously
     * claim a temp file from the pool when needed.
     *
     * `SET temp_directory='opfs://...` can also be used to initialize or change
     * the temp directory at runtime when using "auto" fileHandling.
     */
    tempPath?: string;

    /**
     * Maximum number of pre-allocated file handles in the temp pool beyond
     * returned files will be deleted when closed.
     */
    tempPoolMax?: number;

    /**
     * Minimum number of unused pre-allocated handles to maintain in any temp
     * file pools. When a tempfile is opened from the pool causing the remaining
     * unused handles to drop below this number, new handles will be created
     * asynchronously in the background to refill the pool up to tempPoolMax.
     *
     * Must be less than tempPoolMax.
     */
    tempPoolMin?: number;
}

export enum DuckDBAccessMode {
    UNDEFINED = 0,
    AUTOMATIC = 1,
    READ_ONLY = 2,
    READ_WRITE = 3,
}

export interface DuckDBConfig {
    /**
     * The database path
     */
    path?: string;
    /**
     * The access mode
     */
    accessMode?: DuckDBAccessMode;
    /**
     * The maximum number of threads.
     * Note that this will only work with cross-origin isolated sites since it requires SharedArrayBuffers.
     */
    maximumThreads?: number;
    /**
     * The direct io flag
     */
    useDirectIO?: boolean;
    /**
     * The query config
     */
    query?: DuckDBQueryConfig;
    /**
     * The filesystem config
     */
    filesystem?: DuckDBFilesystemConfig;
    /**
     * Whether to allow unsigned extensions
     */
    allowUnsignedExtensions?: boolean;
    /**
     * Whether to use alternate Arrow conversion that preserves full range and precision of data.
     */
    arrowLosslessConversion?: boolean;
    /**
     * Custom user agent string
     */
    customUserAgent?: string;
    /**
     * opfs string
     */
    opfs?: DuckDBOPFSConfig;
}
