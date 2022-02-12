export interface DuckDBQueryConfig {
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
    /**
     * Allow falling back to full HTTP reads if the server does not support range requests.
     */
    allowFullHTTPReads?: boolean;
}

export interface DuckDBConfig {
    /**
     * The database path
     */
    path?: string;
    /**
     * The maximum number of threads.
     * Note that this will only work with cross-origin isolated sites since it requires SharedArrayBuffers.
     */
    maximumThreads?: number;
    /**
     * The query config
     */
    query?: DuckDBQueryConfig;
    /**
     * The filesystem config
     */
    filesystem?: DuckDBFilesystemConfig;
}
