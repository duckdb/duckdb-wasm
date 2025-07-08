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
