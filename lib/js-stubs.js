// A JavaScript error in a runtime call becomes a C++ exception (duckdb_web_fail_with throws one): it then unwinds
// on the C++ side, and with threads it reaches the thread that made the call. A C++ exception passing through
// (a WebAssembly.Exception) is left alone. Emscripten matches the parameter lists against the signatures, so the
// guard is written out in every stub.
addToLibrary({
    duckdb_web_test_platform_feature__sig: 'ii',
    duckdb_web_test_platform_feature: function (feature) {
        try {
            return globalThis.DUCKDB_RUNTIME.testPlatformFeature(Module, feature);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
    duckdb_web_fs_get_default_data_protocol__sig: 'i',
    duckdb_web_fs_get_default_data_protocol: function (Module) {
        try {
            return globalThis.DUCKDB_RUNTIME.getDefaultDataProtocol(Module);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
    duckdb_web_fs_file_open__sig: 'pii',
    duckdb_web_fs_file_open: function (fileId, flags) {
        try {
            return globalThis.DUCKDB_RUNTIME.openFile(Module, fileId, flags);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
    duckdb_web_fs_file_sync__sig: 'vi',
    duckdb_web_fs_file_sync: function (fileId) {
        try {
            return globalThis.DUCKDB_RUNTIME.syncFile(Module, fileId);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
    duckdb_web_fs_file_drop_file__sig: 'vpi',
    duckdb_web_fs_file_drop_file: function (fileName, fileNameLen) {
        try {
            fileName = fileName >>> 0;
            return globalThis.DUCKDB_RUNTIME.dropFile(Module, fileName, fileNameLen);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
    duckdb_web_fs_file_close__sig: 'vi',
    duckdb_web_fs_file_close: function (fileId) {
        try {
            return globalThis.DUCKDB_RUNTIME.closeFile(Module, fileId);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
    duckdb_web_fs_file_truncate__sig: 'vid',
    duckdb_web_fs_file_truncate: function (fileId, newSize) {
        try {
            return globalThis.DUCKDB_RUNTIME.truncateFile(Module, fileId, newSize);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
    duckdb_web_fs_file_read__sig: 'iipid',
    duckdb_web_fs_file_read: function (fileId, buf, size, location) {
        try {
            buf = buf >>> 0;
            return globalThis.DUCKDB_RUNTIME.readFile(Module, fileId, buf, size, location);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
    duckdb_web_fs_file_write__sig: 'iipid',
    duckdb_web_fs_file_write: function (fileId, buf, size, location) {
        try {
            buf = buf >>> 0;
            return globalThis.DUCKDB_RUNTIME.writeFile(Module, fileId, buf, size, location);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
    duckdb_web_fs_file_get_last_modified_time__sig: 'di',
    duckdb_web_fs_file_get_last_modified_time: function (fileId) {
        try {
            return globalThis.DUCKDB_RUNTIME.getLastFileModificationTime(Module, fileId);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
    duckdb_web_fs_directory_exists__sig: 'ipi',
    duckdb_web_fs_directory_exists: function (path, pathLen) {
        try {
            path = path >>> 0;
            return globalThis.DUCKDB_RUNTIME.checkDirectory(Module, path, pathLen);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
    duckdb_web_fs_directory_create__sig: 'vpi',
    duckdb_web_fs_directory_create: function (path, pathLen) {
        try {
            path = path >>> 0;
            return globalThis.DUCKDB_RUNTIME.createDirectory(Module, path, pathLen);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
    duckdb_web_fs_directory_remove__sig: 'vpi',
    duckdb_web_fs_directory_remove: function (path, pathLen) {
        try {
            path = path >>> 0;
            return globalThis.DUCKDB_RUNTIME.removeDirectory(Module, path, pathLen);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
    duckdb_web_fs_directory_list_files__sig: 'ipi',
    duckdb_web_fs_directory_list_files: function (path, pathLen) {
        try {
            path = path >>> 0;
            return globalThis.DUCKDB_RUNTIME.listDirectoryEntries(Module, path, pathLen);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
    duckdb_web_fs_glob__sig: 'vpi',
    duckdb_web_fs_glob: function (path, pathLen) {
        try {
            path = path >>> 0;
            return globalThis.DUCKDB_RUNTIME.glob(Module, path, pathLen);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
    duckdb_web_fs_file_move__sig: 'vpipi',
    duckdb_web_fs_file_move: function (from, fromLen, to, toLen) {
        try {
            from = from >>> 0; to = to >>> 0;
            return globalThis.DUCKDB_RUNTIME.moveFile(Module, from, fromLen, to, toLen);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
    duckdb_web_fs_file_exists__sig: 'ipi',
    duckdb_web_fs_file_exists: function (path, pathLen) {
        try {
            path = path >>> 0;
            return globalThis.DUCKDB_RUNTIME.checkFile(Module, path, pathLen);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
    duckdb_web_fs_file_remove__sig: 'vpi',
    duckdb_web_fs_file_remove: function (path, pathLen) {
        try {
            path = path >>> 0;
            return globalThis.DUCKDB_RUNTIME.removeFile(Module, path, pathLen);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
    duckdb_web_udf_scalar_call__sig: 'vpipipi',
    duckdb_web_udf_scalar_call: function (response, funcId, descPtr, descSize, ptrsPtr, ptrsSize) {
        try {
            response = response >>> 0; descPtr = descPtr >>> 0; ptrsPtr = ptrsPtr >>> 0;
            return globalThis.DUCKDB_RUNTIME.callScalarUDF(Module, response, funcId, descPtr, descSize, ptrsPtr, ptrsSize);
        } catch (e) {
            if (typeof WebAssembly !== 'undefined' && e instanceof WebAssembly.Exception) throw e;
            Module.ccall('duckdb_web_fail_with', null, ['string'], [String((e && e.message) || e)]);
        }
    },
});
