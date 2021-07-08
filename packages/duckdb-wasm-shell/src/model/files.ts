export interface FileInfo {
    /// The file name
    name: string;
    /// The url
    url: string | null;
    /// The size (if known)
    size: number | null;
    /// The file statistics
    fileStatsEnabled: boolean;
}

export type FileInfoUpdate = Partial<FileInfo> & { name: string };
