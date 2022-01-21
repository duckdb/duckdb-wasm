import {StatusCode} from '../status';
import {addS3Headers, getHTTPUrl} from '../utils'

import {
    callSRet,
    dropResponseBuffers,
    DuckDBDataProtocol,
    DuckDBFileInfo,
    DuckDBGlobalFileInfo,
    DuckDBRuntime,
    failWith,
    FileFlags,
    readString
} from './runtime';
import {DuckDBModule} from './duckdb_module';
import * as udf from './udf_runtime';

export const BROWSER_RUNTIME: DuckDBRuntime & {
    _fileInfoCache: Map<number, DuckDBFileInfo>;
    _globalFileInfo: DuckDBGlobalFileInfo | null;

    getFileInfo(mod: DuckDBModule, fileId: number): DuckDBFileInfo | null;
    getGlobalFileInfo(mod: DuckDBModule): DuckDBGlobalFileInfo | null;
} = {
    _files: new Map<string, any>(),
    _fileInfoCache: new Map<number, DuckDBFileInfo>(),
    _udfFunctions: new Map(),
    _globalFileInfo: null,

    getFileInfo(mod: DuckDBModule, fileId: number): DuckDBFileInfo | null {
        try {
            const cached = BROWSER_RUNTIME._fileInfoCache.get(fileId);
            const [s, d, n] = callSRet(mod, 'duckdb_web_fs_get_file_info_by_id', ['number', 'number'], [fileId, cached?.cacheEpoch || 0]);
            if (s !== StatusCode.SUCCESS) {
                return null;
            } else if (n === 0) {
                // Epoch is up to date
                return cached!;
            }
            const infoStr = readString(mod, d, n);
            dropResponseBuffers(mod);
            const info = JSON.parse(infoStr);
            if (info == null) {
                return null;
            }
            const file = { ...info, blob: null } as DuckDBFileInfo;
            BROWSER_RUNTIME._fileInfoCache.set(fileId, file);
            return file;
        } catch (e: any) {
            return null;
        }
    },

    getGlobalFileInfo(mod: DuckDBModule): DuckDBGlobalFileInfo | null {
        try {
            const [s, d, n] = callSRet(mod, 'duckdb_web_get_global_file_info', ['number'], [BROWSER_RUNTIME._globalFileInfo?.cacheEpoch || 0]);
            if (s !== StatusCode.SUCCESS) {
                return null;
            } else if (n === 0) {
                // Epoch is up to date
                return BROWSER_RUNTIME._globalFileInfo!;
            }
            const infoStr = readString(mod, d, n);
            dropResponseBuffers(mod);
            const info = JSON.parse(infoStr);
            if (info == null) {
                return null;
            }
            BROWSER_RUNTIME._globalFileInfo = { ...info, blob: null } as DuckDBGlobalFileInfo;

            return BROWSER_RUNTIME._globalFileInfo;
        } catch (e: any) {
            return null;
        }
    },

    testPlatformFeature: (_mod: DuckDBModule, feature: number): boolean => {
        switch (feature) {
            case 1:
                return typeof BigInt64Array !== 'undefined';
            default:
                console.warn(`test for unknown feature: ${feature}`);
                return false;
        }
    },

    openFile: (mod: DuckDBModule, fileId: number, flags: FileFlags): number => {
        try {
            BROWSER_RUNTIME._fileInfoCache.delete(fileId);
            const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
            switch (file?.dataProtocol) {
                case DuckDBDataProtocol.HTTP:
                case DuckDBDataProtocol.S3: {
                    if (flags & FileFlags.FILE_FLAGS_READ && flags & FileFlags.FILE_FLAGS_WRITE) {
                        throw new Error(`Opening file ${file.fileName} failed: cannot open file with both read and write flags set`);
                    } else if (flags & FileFlags.FILE_FLAGS_APPEND){
                        throw new Error(`Opening file ${file.fileName} failed: appending to HTTP/S3 files is not supported`);
                    } else if (flags & FileFlags.FILE_FLAGS_WRITE) {
                        // We send a HEAD request to try to determine if we can write to data_url
                        const xhr = new XMLHttpRequest();
                        if (file.dataProtocol == DuckDBDataProtocol.S3) {
                            xhr.open('HEAD', getHTTPUrl(file.s3Config, file.dataUrl!), false);
                            addS3Headers(xhr, file.s3Config, file.dataUrl!, 'HEAD');
                        } else {
                            xhr.open('HEAD', file.dataUrl!, false);
                        }
                        xhr.send(null);

                        // Expect 200 for existing files that we will overwrite or 404 for non-existent files can be created
                        if (xhr.status != 200 && xhr.status != 404) {
                            throw new Error(`Opening file ${file.fileName} failed: Unexpected return status from server (${xhr.status})`);
                        } else if (xhr.status == 404 &&!(flags & FileFlags.FILE_FLAGS_FILE_CREATE || flags & FileFlags.FILE_FLAGS_FILE_CREATE_NEW)) {
                            throw new Error(`Opening file ${file.fileName} failed: Cannot write to non-existent file without FILE_FLAGS_FILE_CREATE or FILE_FLAGS_FILE_CREATE_NEW flag.`);
                        }
                        // Return an empty buffer that can be used to buffer the writes to this s3/http file
                        const data = mod._malloc(1);
                        const src = new Uint8Array();
                        mod.HEAPU8.set(src, data);
                        const result = mod._malloc(2 * 8);
                        mod.HEAPF64[(result >> 3) + 0] = 1;
                        mod.HEAPF64[(result >> 3) + 1] = data;
                        return result;
                    } else if (flags != FileFlags.FILE_FLAGS_READ) {
                        throw new Error(`Opening file ${file.fileName} failed: unsupported file flags: ${flags}`);
                    }

                    // Supports ranges?
                    let error: any | null = null;
                    try {
                        // Send a dummy range request querying the first byte of the file
                        const xhr = new XMLHttpRequest();
                        if (file.dataProtocol == DuckDBDataProtocol.S3) {
                            xhr.open('HEAD', getHTTPUrl(file.s3Config, file.dataUrl!), false);
                            addS3Headers(xhr, file.s3Config, file.dataUrl!, 'HEAD');
                        } else {
                            xhr.open('HEAD', file.dataUrl!, false);
                        }
                        xhr.setRequestHeader('Range', `bytes=0-`);
                        xhr.send(null);

                        // Supports range requests
                        const contentLength = xhr.getResponseHeader('Content-Length');
                        if (xhr.status == 206 && contentLength !== null) {
                            const result = mod._malloc(2 * 8);
                            mod.HEAPF64[(result >> 3) + 0] = +contentLength;
                            mod.HEAPF64[(result >> 3) + 1] = 0;
                            return result;
                        }
                    } catch (e: any) {
                        error = e;
                        console.warn(`HEAD request with range header failed: ${e}`);
                    }

                    // Try to fallback to full read?
                    if (file.allowFullHttpReads) {
                        console.warn(`falling back to full HTTP read for: ${file.dataUrl}`);

                        // Send non-range request
                        const xhr = new XMLHttpRequest();
                        if (file.dataProtocol == DuckDBDataProtocol.S3) {
                            xhr.open('GET', getHTTPUrl(file.s3Config, file.dataUrl!), false);
                            addS3Headers(xhr, file.s3Config, file.dataUrl!, 'GET');
                        } else {
                            xhr.open('GET', file.dataUrl!, false);
                        }
                        xhr.responseType = 'arraybuffer';
                        xhr.send(null);

                        // Return buffer
                        if (xhr.status == 200) {
                            const data = mod._malloc(xhr.response.byteLength);
                            const src = new Uint8Array(xhr.response, 0, xhr.response.byteLength);
                            mod.HEAPU8.set(src, data);
                            const result = mod._malloc(2 * 8);
                            mod.HEAPF64[(result >> 3) + 0] = xhr.response.byteLength;
                            mod.HEAPF64[(result >> 3) + 1] = data;
                            return result;
                        }
                    }

                    // Raise error?
                    if (error != null) {
                        throw new Error(`Reading file ${file.fileName} failed with error: ${error}`);
                    }
                    return 0;
                }
                // Native File
                case DuckDBDataProtocol.NATIVE: {
                    const handle = BROWSER_RUNTIME._files?.get(file.fileName);
                    if (handle) {
                        const result = mod._malloc(2 * 8);
                        mod.HEAPF64[(result >> 3) + 0] = handle.size;
                        mod.HEAPF64[(result >> 3) + 1] = 0;
                        return result;
                    }

                    // Fall back to empty buffered file in the browser
                    console.warn(`Buffering missing file: ${file.fileName}`);
                    const result = mod._malloc(2 * 8);
                    const buffer = mod._malloc(1); // malloc(0) is allowed to return a nullptr
                    mod.HEAPF64[(result >> 3) + 0] = 1;
                    mod.HEAPF64[(result >> 3) + 1] = buffer;
                    return result;
                }
            }
        } catch (e: any) {
            // TODO (samansmink): this path causes the WASM code to hang
            console.error(e.toString());
            failWith(mod, e.toString());
        }
        return 0;
    },
    glob: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        try {
            const path = readString(mod, pathPtr, pathLen);
            // Starts with http?
            // Try a HTTP HEAD request
            if (path.startsWith('http') || path.startsWith('s3://')) {
                // Send a dummy range request querying the first byte of the file
                const xhr = new XMLHttpRequest();
                if (path.startsWith('s3://')) {
                    const globalInfo = BROWSER_RUNTIME.getGlobalFileInfo(mod);
                    xhr.open('HEAD', getHTTPUrl(globalInfo?.s3Config, path), false);
                    addS3Headers(xhr, globalInfo?.s3Config, path, 'HEAD');
                } else {
                    xhr.open('HEAD', path!, false);
                }
                xhr.send(null);
                if (xhr.status != 200 && xhr.status !== 206) {
                    failWith(mod, `HEAD request failed: ${path}`);
                    return;
                }
                mod.ccall('duckdb_web_fs_glob_add_path', null, ['string'], [path]);
            }
        } catch (e: any) {
            failWith(mod, e.toString());
            return 0;
        }
    },
    checkFile: (mod: DuckDBModule, pathPtr: number, pathLen: number): boolean => {
        try {
            const path = readString(mod, pathPtr, pathLen);
            // Starts with http or S3?
            // Try a HTTP HEAD request
            if (path.startsWith('http') || path.startsWith('s3://')) {
                // Send a dummy range request querying the first byte of the file
                const xhr = new XMLHttpRequest();
                if (path.startsWith('s3://')) {
                    const globalInfo = BROWSER_RUNTIME.getGlobalFileInfo(mod);
                    xhr.open('HEAD', getHTTPUrl(globalInfo?.s3Config, path), false);
                    addS3Headers(xhr, globalInfo?.s3Config, path, 'HEAD');
                } else {
                    xhr.open('HEAD', path!, false);
                }

                xhr.setRequestHeader('Range', `bytes=0-`);
                xhr.send(null);
                let supportsRanges = false;
                if (xhr.status == 206) {
                    supportsRanges = true;
                } else if (xhr.status == 200) {
                    const header = xhr.getResponseHeader('Accept-Ranges');
                    supportsRanges = header === 'bytes';
                } else {
                    return false;
                }
                if (!supportsRanges) {
                    return false;
                }

                // HTTP file exists and supports range requests
                return true;
            }
        } catch (e: any) {
            return false;
        }
        return false;
    },
    syncFile: (_mod: DuckDBModule, _fileId: number) => {},
    closeFile: (mod: DuckDBModule, fileId: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        BROWSER_RUNTIME._fileInfoCache.delete(fileId);
        switch (file?.dataProtocol) {
            case DuckDBDataProtocol.HTTP:
            case DuckDBDataProtocol.S3:
                break;
            case DuckDBDataProtocol.NATIVE:
                // XXX Remove from registry
                return;
        }
    },
    truncateFile: (mod: DuckDBModule, fileId: number, newSize: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.dataProtocol) {
            case DuckDBDataProtocol.HTTP:
                failWith(mod, `Cannot truncate a http file`);
                return;
            case DuckDBDataProtocol.S3:
                failWith(mod, `Cannot truncate an s3 file`);
                return;
            case DuckDBDataProtocol.NATIVE:
                failWith(mod, `truncateFile not implemented`);
                return;
        }
        return 0;
    },
    readFile(mod: DuckDBModule, fileId: number, buf: number, bytes: number, location: number) {
        try {
            const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
            switch (file?.dataProtocol) {
                // File reading from BLOB or HTTP MUST be done with range requests.
                // We have to check in OPEN if such file supports range requests and upgrade to BUFFER if not.
                case DuckDBDataProtocol.HTTP:
                case DuckDBDataProtocol.S3: {
                    if (!file.dataUrl) {
                        throw new Error(`Missing data URL for file ${fileId}`);
                    }
                    try {
                        const xhr = new XMLHttpRequest();
                        if (file.dataProtocol == DuckDBDataProtocol.S3) {
                            xhr.open('GET', getHTTPUrl(file?.s3Config, file.dataUrl!), false);
                            addS3Headers(xhr, file?.s3Config, file.dataUrl!, 'GET');
                        } else {
                            xhr.open('GET', file.dataUrl!, false);
                        }
                        xhr.responseType = 'arraybuffer';
                        xhr.setRequestHeader('Range', `bytes=${location}-${location + bytes - 1}`);
                        xhr.send(null);
                        if (
                            xhr.status == 206 /* Partial content */ ||
                            (xhr.status == 200 && bytes == xhr.response.byteLength && location == 0)
                        ) {
                            const src = new Uint8Array(xhr.response, 0, Math.min(xhr.response.byteLength, bytes));
                            mod.HEAPU8.set(src, buf);
                            return src.byteLength;
                        } else if (xhr.status == 200) {
                            throw new Error(
                                `Range request for ${file.dataUrl} did not return a partial response: ${xhr.status} "${xhr.statusText}"`,
                            );
                        } else {
                            throw new Error(
                                `Range request for ${file.dataUrl} did returned non-success status: ${xhr.status} "${xhr.statusText}"`,
                            );
                        }
                    } catch (e) {
                        throw new Error(`Range request for ${file.dataUrl} failed with error: ${e}"`);
                    }
                }
                case DuckDBDataProtocol.NATIVE: {
                    const handle = BROWSER_RUNTIME._files?.get(file.fileName);
                    if (!handle) {
                        throw new Error(`No handle available for file: ${file.fileName}`);
                    }
                    const sliced = handle!.slice(location, location + bytes);
                    const data = new Uint8Array(new FileReaderSync().readAsArrayBuffer(sliced));
                    mod.HEAPU8.set(data, buf);
                    return data.byteLength;
                }
            }
            return 0;
        } catch (e: any) {
            failWith(mod, e.toString());
            return 0;
        }
    },
    writeFile: (mod: DuckDBModule, fileId: number, buf: number, bytes: number, location: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.dataProtocol) {
            case DuckDBDataProtocol.HTTP:
                failWith(mod, 'Cannot write to HTTP file');
                return 0;
            case DuckDBDataProtocol.S3: {
                const buffer = mod.HEAPU8.subarray(buf, buf + bytes);
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', getHTTPUrl(file?.s3Config, file.dataUrl!), false);
                addS3Headers(xhr, file?.s3Config, file.dataUrl!, 'PUT', '', buffer);
                xhr.send(buffer);
                return bytes;
            }
            case DuckDBDataProtocol.NATIVE:
                failWith(mod, 'writefile not implemented');
                return 0;
        }
        return 0;
    },
    getLastFileModificationTime: (mod: DuckDBModule, fileId: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.dataProtocol) {
            case DuckDBDataProtocol.NATIVE: {
                const handle = BROWSER_RUNTIME._files?.get(file.fileName);
                if (!handle) {
                    throw Error(`No handle available for file: ${file.fileName}`);
                }
                return 0;
            }

            case DuckDBDataProtocol.HTTP:
            case DuckDBDataProtocol.S3:
                return new Date().getTime();
        }
        return 0;
    },
    checkDirectory: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        const path = readString(mod, pathPtr, pathLen);
        console.log(`checkDirectory: ${path}`);
        return false;
    },
    createDirectory: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        const path = readString(mod, pathPtr, pathLen);
        console.log(`createDirectory: ${path}`);
    },
    removeDirectory: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        const path = readString(mod, pathPtr, pathLen);
        console.log(`removeDirectory: ${path}`);
    },
    listDirectoryEntries: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        const path = readString(mod, pathPtr, pathLen);
        console.log(`listDirectoryEntries: ${path}`);
        return false;
    },
    moveFile: (_mod: DuckDBModule, _fromPtr: number, _fromLen: number, _toPtr: number, _toLen: number) => {},
    removeFile: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {},
    callScalarUDF: (
        mod: DuckDBModule,
        response: number,
        funcId: number,
        bufferPtr: number,
        bufferSize: number,
    ): void => {
        udf.callScalarUDF(BROWSER_RUNTIME, mod, response, funcId, bufferPtr, bufferSize);
    },
};

export default BROWSER_RUNTIME;
