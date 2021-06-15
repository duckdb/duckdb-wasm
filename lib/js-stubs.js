mergeInto(LibraryManager.library, {
    duckdb_web_fs_file_open: function (fileId) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_open(fileId);
    },
    duckdb_web_fs_file_sync: function (fileId) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_sync(fileId);
    },
    duckdb_web_fs_file_close: function (fileId) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_close(fileId);
    },
    duckdb_web_fs_file_truncate: function (fileId, newSize) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_truncate(fileId, newSize);
    },
    duckdb_web_fs_file_read: function (fileId, buf, size, location) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_read(fileId, buf, size, location);
    },
    duckdb_web_fs_file_write: function (fileId, buf, size, location) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_write(fileId, buf, size, location);
    },
    duckdb_web_fs_file_get_size: function (fileId) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_get_size(fileId);
    },
    duckdb_web_fs_file_get_last_modified_time: function (fileId) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_get_last_modified_time(fileId);
    },
    duckdb_web_fs_directory_exists: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_directory_exists(path, pathLen);
    },
    duckdb_web_fs_directory_create: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_directory_create(path, pathLen);
    },
    duckdb_web_fs_directory_remove: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_directory_remove(path, pathLen);
    },
    duckdb_web_fs_directory_list_files: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_directory_list_files(path, pathLen);
    },
    duckdb_web_fs_glob: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_glob(path, pathLen);
    },
    duckdb_web_fs_file_move: function (from, fromLen, to, toLen) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_move(from, fromLen, to, toLen);
    },
    duckdb_web_fs_file_exists: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_exists(path, pathLen);
    },
    duckdb_web_fs_file_remove: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_remove(path, pathLen);
    },
});
