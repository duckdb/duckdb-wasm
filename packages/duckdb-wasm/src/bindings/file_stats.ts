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
export class FileStatistics {
    /** The cold file reads */
    public totalFileReadsCold: number;
    /** The file readaheads */
    public totalFileReadsAhead: number;
    /** The cached file reads */
    public totalFileReadsCached: number;
    /** The file writes */
    public totalFileWrites: number;
    /** The page accesses */
    public totalPageAccesses: number;
    /** The page loads */
    public totalPageLoads: number;
    /** The blocks */
    public blockSize: number;
    /** The blocks */
    public blockStats: Uint8Array;

    constructor(u8array: Uint8Array) {
        const f64 = new Float64Array(u8array.buffer, u8array.byteOffset, u8array.byteLength / 8);
        const blocks = new Uint8Array(new ArrayBuffer(u8array.byteLength));
        blocks.set(u8array.subarray(7 * 8));
        this.totalFileReadsCold = f64[0];
        this.totalFileReadsAhead = f64[1];
        this.totalFileReadsCached = f64[2];
        this.totalFileWrites = f64[3];
        this.totalPageAccesses = f64[4];
        this.totalPageLoads = f64[5];
        this.blockSize = f64[6];
        this.blockStats = blocks;
    }

    /** The block stats */
    public getBlockStats(index: number, out?: FileBlockStatistics): FileBlockStatistics {
        out = out || {
            file_reads_cold: 0,
            file_reads_ahead: 0,
            file_reads_cached: 0,
            file_writes: 0,
            page_accesses: 0,
            page_loads: 0,
        };
        out.file_writes = this.blockStats[index * 3 + 0] & 0b1111;
        out.file_reads_cold = this.blockStats[index * 3 + 0] >> 4;
        out.file_reads_ahead = this.blockStats[index * 3 + 1] & 0b1111;
        out.file_reads_cached = this.blockStats[index * 3 + 1] >> 4;
        out.page_accesses = this.blockStats[index * 3 + 1] & 0b1111;
        out.page_loads = this.blockStats[index * 3 + 1] >> 4;
        return out;
    }
}
