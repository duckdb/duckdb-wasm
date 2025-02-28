type FileSystemSyncAccessHandleMode = 'readwrite' | 'read-only' | 'readwrite-unsafe';

interface FileSystemCreateSyncAccessHandleOptions {
    mode?: FileSystemSyncAccessHandleMode
}

interface FileSystemFileHandle {
    createSyncAccessHandle(optional: FileSystemCreateSyncAccessHandleOptions = {}): Promise<FileSystemSyncAccessHandle>;
}

interface FileSystemSyncAccessHandle {
    mode: FileSystemSyncAccessHandleMode;
}