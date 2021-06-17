mergeInto(LibraryManager.library, {
    duckdb_web_fs_file_open: function (fileId) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_open(Module, fileId);
    },
    duckdb_web_fs_file_sync: function (fileId) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_sync(Module, fileId);
    },
    duckdb_web_fs_file_close: function (fileId) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_close(Module, fileId);
    },
    duckdb_web_fs_file_truncate: function (fileId, newSize) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_truncate(Module, fileId, newSize);
    },
    duckdb_web_fs_file_read: function (fileId, buf, size, location) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_read(Module, fileId, buf, size, location);
    },
    duckdb_web_fs_file_write: function (fileId, buf, size, location) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_write(Module, fileId, buf, size, location);
    },
    duckdb_web_fs_file_get_size: function (fileId) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_get_size(Module, fileId);
    },
    duckdb_web_fs_file_get_last_modified_time: function (fileId) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_get_last_modified_time(Module, fileId);
    },
    duckdb_web_fs_directory_exists: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_directory_exists(Module, path, pathLen);
    },
    duckdb_web_fs_directory_create: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_directory_create(Module, path, pathLen);
    },
    duckdb_web_fs_directory_remove: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_directory_remove(Module, path, pathLen);
    },
    duckdb_web_fs_directory_list_files: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_directory_list_files(Module, path, pathLen);
    },
    duckdb_web_fs_glob: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_glob(Module, path, pathLen);
    },
    duckdb_web_fs_file_move: function (from, fromLen, to, toLen) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_move(Module, from, fromLen, to, toLen);
    },
    duckdb_web_fs_file_exists: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_exists(Module, path, pathLen);
    },
    duckdb_web_fs_file_remove: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.duckdb_web_fs_file_remove(Module, path, pathLen);
    },
});
