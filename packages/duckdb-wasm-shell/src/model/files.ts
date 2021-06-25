export interface FileInfo {
    /// The file name
    name: string;
    /// The url
    url: string | null;
    /// The size (if known)
    size: number | null;
    /// The download progress
    downloadProgress: number | null;
}
