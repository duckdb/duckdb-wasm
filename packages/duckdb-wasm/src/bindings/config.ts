/** A DuckDB Config */
export interface DuckDBConfig {
    /// The database path
    path?: string;
    /// Emit BigInts?
    emitBigInt?: boolean;
    /// The maximum number of threads.
    /// Note that this will only work with cross-origin isolated sites since it requires SharedArrayBuffers.
    maximumThreads?: number;
}
