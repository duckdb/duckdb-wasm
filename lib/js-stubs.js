mergeInto(LibraryManager.library, {
    duckdb_web_test_platform_feature: function (feature) {
        return globalThis.DUCKDB_RUNTIME.testPlatformFeature(Module, feature);
    },
    duckdb_web_fs_file_open: function (fileId, flags) {
        return globalThis.DUCKDB_RUNTIME.openFile(Module, fileId, flags);
    },
    duckdb_web_fs_file_sync: function (fileId) {
        return globalThis.DUCKDB_RUNTIME.syncFile(Module, fileId);
    },
    duckdb_web_fs_file_close: function (fileId) {
        return globalThis.DUCKDB_RUNTIME.closeFile(Module, fileId);
    },
    duckdb_web_fs_file_truncate: function (fileId, newSize) {
        return globalThis.DUCKDB_RUNTIME.truncateFile(Module, fileId, newSize);
    },
    duckdb_web_fs_file_read: function (fileId, buf, size, location) {
        return globalThis.DUCKDB_RUNTIME.readFile(Module, fileId, buf, size, location);
    },
    duckdb_web_fs_file_write: function (fileId, buf, size, location) {
        return globalThis.DUCKDB_RUNTIME.writeFile(Module, fileId, buf, size, location);
    },
    duckdb_web_fs_file_get_last_modified_time: function (fileId) {
        return globalThis.DUCKDB_RUNTIME.getLastFileModificationTime(Module, fileId);
    },
    duckdb_web_fs_directory_exists: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.checkDirectory(Module, path, pathLen);
    },
    duckdb_web_fs_directory_create: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.createDirectory(Module, path, pathLen);
    },
    duckdb_web_fs_directory_remove: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.removeDirectory(Module, path, pathLen);
    },
    duckdb_web_fs_directory_list_files: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.listDirectoryEntries(Module, path, pathLen);
    },
    duckdb_web_fs_glob: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.glob(Module, path, pathLen);
    },
    duckdb_web_fs_file_move: function (from, fromLen, to, toLen) {
        return globalThis.DUCKDB_RUNTIME.moveFile(Module, from, fromLen, to, toLen);
    },
    duckdb_web_fs_file_exists: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.checkFile(Module, path, pathLen);
    },
    duckdb_web_fs_file_remove: function (path, pathLen) {
        return globalThis.DUCKDB_RUNTIME.removeFile(Module, path, pathLen);
    },
    duckdb_web_udf_scalar_call: function (funcId, descPtr, descSize, ptrsPtr, ptrsSize, response) {
        return globalThis.DUCKDB_RUNTIME.callScalarUDF(Module, funcId, descPtr, descSize, ptrsPtr, ptrsSize, response);
    },
});
