interface FileSystemFileHandle extends FileSystemHandle {
    createSyncAccessHandle(mode?: 'read' | 'readwrite' | 'readwrite-unsafe'): Promise<FileSystemSyncAccessHandle>;
}