export interface FileBlockStatistics {
    /** The file reads cold */
    file_reads_cold: number;
    /** The file reads aheads */
    file_reads_ahead: number;
    /** The file reads cached */
    file_reads_cached: number;
    /** The file writes */
    file_writes: number;
    /** The page accesses */
    page_accesses: number;
    /** The page loads */
    page_loads: number;
}
/** The file block statistics */
export declare class FileStatistics {
    /** The cold file reads */
    totalFileReadsCold: number;
    /** The file readaheads */
    totalFileReadsAhead: number;
    /** The cached file reads */
    totalFileReadsCached: number;
    /** The file writes */
    totalFileWrites: number;
    /** The page accesses */
    totalPageAccesses: number;
    /** The page loads */
    totalPageLoads: number;
    /** The blocks */
    blockSize: number;
    /** The blocks */
    blockStats: Uint8Array;
    constructor(u8array: Uint8Array);
    /** The block stats */
    getBlockStats(index: number, out?: FileBlockStatistics): FileBlockStatistics;
}
