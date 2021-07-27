import { StatusCode } from '../status';
import {
    DuckDBRuntime,
    DuckDBFileInfo,
    callSRet,
    failWith,
    dropResponseBuffers,
    readString,
    DuckDBDataProtocol,
} from './runtime';
import { DuckDBModule } from '../targets/duckdb-browser-sync-next';

export const BROWSER_RUNTIME: DuckDBRuntime & {
    fileInfoCache: Map<number, DuckDBFileInfo>;

    getFileInfo(mod: DuckDBModule, fileId: number): DuckDBFileInfo | null;
} = {
    fileInfoCache: new Map<number, DuckDBFileInfo>(),

    getFileInfo(mod: DuckDBModule, fileId: number): DuckDBFileInfo | null {
        try {
            const cached = BROWSER_RUNTIME.fileInfoCache.get(fileId);
            if (cached) return cached;
            const [s, d, n] = callSRet(mod, 'duckdb_web_fs_get_file_info', ['number'], [fileId]);
            if (s !== StatusCode.SUCCESS) {
                throw new Error(readString(mod, d, n));
            }
            const infoStr = readString(mod, d, n);
            dropResponseBuffers(mod);
            const info = JSON.parse(infoStr);
            if (info == null) {
                return null;
            }
            const file = { ...info, blob: null } as DuckDBFileInfo;
            BROWSER_RUNTIME.fileInfoCache.set(fileId, file);
            return file;
        } catch (e) {
            failWith(mod, e.toString());
            return null;
        }
    },

    openFile: (mod: DuckDBModule, fileId: number): number => {
        try {
            BROWSER_RUNTIME.fileInfoCache.delete(fileId);
            const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
            switch (file?.data_protocol) {
                // Find out whether the HTTP source supports range requests.
                //
                // XXX We might want to let the user explicitly opt into this fallback behavior here.
                //     If the user expects range requests but gets full downloads, the slowdown might be horrendous.
                case DuckDBDataProtocol.HTTP: {
                    // Send a dummy range request querying the first byte of the file
                    const xhr = new XMLHttpRequest();
                    xhr.open('HEAD', file.data_url!, false);
                    xhr.setRequestHeader('Range', `bytes=0-`);
                    xhr.send(null);

                    // Supports range requests
                    let supportsRanges = false;
                    if (xhr.status == 206) {
                        supportsRanges = true;
                    } else if (xhr.status == 200) {
                        const header = xhr.getResponseHeader('Accept-Ranges');
                        supportsRanges = header === 'bytes';
                    }
                    if (!supportsRanges) {
                        failWith(mod, `File does not support range requests: ${file.file_name}`);
                        return 0;
                    }
                    break;
                }
                case DuckDBDataProtocol.NATIVE: {
                    const handle = BROWSER_RUNTIME._files?.get(file.file_name);
                    if (!handle) {
                        failWith(mod, `No handle available for file: ${file.file_name}`);
                        return 0;
                    }
                    break;
                }
            }
        } catch (e) {
            failWith(mod, e.toString());
        }
        return 0;
    },
    glob: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        try {
            const path = readString(mod, pathPtr, pathLen);

            // Starts with http?
            // Try a HTTP HEAD request
            if (path.startsWith('http')) {
                // Send a dummy range request querying the first byte of the file
                const xhr = new XMLHttpRequest();
                xhr.open('HEAD', path!, false);
                xhr.setRequestHeader('Range', `bytes=0-`);
                xhr.send(null);
                let supportsRanges = false;
                if (xhr.status == 206) {
                    supportsRanges = true;
                } else if (xhr.status == 200) {
                    const header = xhr.getResponseHeader('Accept-Ranges');
                    supportsRanges = header === 'bytes';
                } else {
                    failWith(mod, `HEAD request failed: ${path}`);
                    return;
                }
                if (!supportsRanges) {
                    failWith(mod, `File does not support range requests: ${path}`);
                    return;
                }
                mod.ccall('duckdb_web_fs_glob_add_path', null, ['string'], [path]);
            }
        } catch (e) {
            failWith(mod, e.toString());
            return 0;
        }
    },
    checkFile: (mod: DuckDBModule, pathPtr: number, pathLen: number): boolean => {
        try {
            const path = readString(mod, pathPtr, pathLen);

            // Starts with http?
            // Try a HTTP HEAD request
            if (path.startsWith('http')) {
                // Send a dummy range request querying the first byte of the file
                const xhr = new XMLHttpRequest();
                xhr.open('HEAD', path!, false);
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
        } catch (e) {
            return false;
        }
        return false;
    },
    syncFile: (_mod: DuckDBModule, _fileId: number) => {},
    closeFile: (mod: DuckDBModule, fileId: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        BROWSER_RUNTIME.fileInfoCache.delete(fileId);
        switch (file?.data_protocol) {
            case DuckDBDataProtocol.HTTP:
                break;
            case DuckDBDataProtocol.NATIVE:
                // XXX Remove from registry
                return;
        }
    },
    truncateFile: (mod: DuckDBModule, fileId: number, newSize: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.data_protocol) {
            case DuckDBDataProtocol.HTTP:
                failWith(mod, `Cannot truncate a http file`);
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
            switch (file?.data_protocol) {
                // File reading from BLOB or HTTP MUST be done with range requests.
                // We have to check in OPEN if such file supports range requests and upgrade to BUFFER if not.
                case DuckDBDataProtocol.HTTP: {
                    if (!file.data_url) {
                        failWith(mod, `Missing data URL for file ${fileId}`);
                        return 0;
                    }
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', file.data_url!, false);
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
                        failWith(
                            mod,
                            `Range request for ${file.data_url} did not return a partial response: ${xhr.status} "${xhr.statusText}"`,
                        );
                        return 0;
                    } else {
                        failWith(
                            mod,
                            `Range request for ${file.data_url} did returned non-success status: ${xhr.status} "${xhr.statusText}"`,
                        );
                        return 0;
                    }
                }
                case DuckDBDataProtocol.NATIVE: {
                    const handle = BROWSER_RUNTIME._files?.get(file.file_name);
                    if (!handle) {
                        failWith(mod, `No handle available for file: ${file.file_name}`);
                        return 0;
                    }
                    const sliced = handle!.slice(location, location + bytes);
                    const data = new Uint8Array(new FileReaderSync().readAsArrayBuffer(sliced));
                    mod.HEAPU8.set(data, buf);
                    return data.byteLength;
                }
            }
            return 0;
        } catch (e) {
            failWith(mod, e.toString());
            return 0;
        }
    },
    writeFile: (mod: DuckDBModule, fileId: number, buf: number, bytes: number, location: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.data_protocol) {
            case DuckDBDataProtocol.HTTP:
                failWith(mod, 'Cannot write to HTTP file');
                return 0;

            case DuckDBDataProtocol.NATIVE:
                failWith(mod, 'writefile not implemented');
                return 0;
        }
        return 0;
    },
    getFileSize: (mod: DuckDBModule, fileId: number) => {
        try {
            const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
            switch (file?.data_protocol) {
                case DuckDBDataProtocol.NATIVE: {
                    const handle = BROWSER_RUNTIME._files?.get(file.file_name);
                    if (!handle) {
                        failWith(mod, `No handle available for file: ${file.file_name}`);
                        return 0;
                    }
                    return handle.size;
                }

                case DuckDBDataProtocol.HTTP: {
                    if (!file.data_url) throw new Error(`Missing data URL for file ${fileId}`);
                    const xhr = new XMLHttpRequest();
                    xhr.open('HEAD', file.data_url!, false);
                    xhr.send(null);
                    if (xhr.status == 200) {
                        const header = xhr.getResponseHeader('Content-Length');
                        if (header) {
                            return parseInt(header);
                        } else {
                            throw Error(`HEAD ${file.data_url} does not contain the HTTP header: Content-Length`);
                        }
                    } else {
                        throw Error(
                            `HEAD ${file.data_url} returned non-success status: ${xhr.status} "${xhr.statusText}"`,
                        );
                    }
                }
            }
            return 0;
        } catch (e) {
            failWith(mod, e.toString());
            return 0;
        }
    },
    getLastFileModificationTime: (mod: DuckDBModule, fileId: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.data_protocol) {
            case DuckDBDataProtocol.NATIVE: {
                const handle = BROWSER_RUNTIME._files?.get(file.file_name);
                if (!handle) {
                    throw Error(`No handle available for file: ${file.file_name}`);
                }
                return 0;
            }

            case DuckDBDataProtocol.HTTP:
                return new Date().getTime();
        }
        return 0;
    },
    checkDirectory: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => false,
    createDirectory: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {},
    removeDirectory: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {},
    listDirectoryEntries: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => false,
    moveFile: (_mod: DuckDBModule, _fromPtr: number, _fromLen: number, _toPtr: number, _toLen: number) => {},
    removeFile: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {},
};

export default BROWSER_RUNTIME;
