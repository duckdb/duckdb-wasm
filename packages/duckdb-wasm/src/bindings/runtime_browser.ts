import { StatusCode } from '../status';
import {
    DuckDBRuntime,
    DuckDBFileInfo,
    callSRet,
    dropResponseBuffers,
    readString,
    DuckDBDataProtocol,
} from './runtime';
import { DuckDBModule } from 'src/targets/duckdb-browser-sync-next';

export const BROWSER_RUNTIME: DuckDBRuntime & {
    fileInfoCache: Map<number, DuckDBFileInfo>;

    getFileInfo(mod: DuckDBModule, fileId: number): DuckDBFileInfo | null;
} = {
    fileInfoCache: new Map<number, DuckDBFileInfo>(),

    getFileInfo(mod: DuckDBModule, fileId: number): DuckDBFileInfo | null {
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
    },

    openFile: (mod: DuckDBModule, fileId: number): number => {
        BROWSER_RUNTIME.fileInfoCache.delete(fileId);
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.data_protocol) {
            // Find out whether the HTTP source supports range requests.
            // Only Chrome implements range requests for object URLs unfortunately.
            // That means we have to buffer everything in firefox for now...
            //
            // XXX We might want to let the user explicitly opt into this fallback behavior here.
            //     If the user expects range requests but gets full downloads, the slowdown might be horrendous.
            case DuckDBDataProtocol.HTTP: {
                // Send a dummy range request querying the first byte of the file
                const xhr = new XMLHttpRequest();
                xhr.open('GET', file.data_url!, false);
                xhr.responseType = 'arraybuffer';
                xhr.setRequestHeader('Range', `bytes=0-1`);
                xhr.send(null);
                if (xhr.status == 206) {
                    // Source supports partial reading, no explicit buffering necessary.
                } else if (xhr.status == 200) {
                    console.info(
                        `File does not support range requests, buffering everything in WASM instead. url=${file.data_url!}`,
                    );

                    // Source returned us everything, great!
                    // Copy everything into wasm.
                    const buffer = xhr.response as ArrayBuffer;
                    const bufferPtr = mod._malloc(buffer.byteLength);
                    mod.HEAPU8.set(new Uint8Array(buffer), bufferPtr);

                    // Allocate the buffer descriptor (offset + length)
                    const desc = mod._malloc(4 + 4);
                    mod.HEAPU32[(desc >> 2) + 0] = bufferPtr;
                    mod.HEAPU32[(desc >> 2) + 1] = buffer.byteLength;
                    return desc;
                } else {
                    throw Error(
                        `Accessing file returned non-success status ${xhr.status} "${xhr.statusText}". url=${file.data_url}`,
                    );
                }
                break;
            }
            case DuckDBDataProtocol.NATIVE: {
                const handle = BROWSER_RUNTIME._files?.get(file.file_name);
                if (!handle) {
                    console.log('open');
                    console.log(BROWSER_RUNTIME._files);
                    throw Error(`No handle available for file: ${file.file_name}`);
                }
                break;
            }
        }
        return 0;
    },
    syncFile: (_mod: DuckDBModule, _fileId: number) => {},
    closeFile: (mod: DuckDBModule, fileId: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        BROWSER_RUNTIME.fileInfoCache.delete(fileId);
        switch (file?.data_protocol) {
            case DuckDBDataProtocol.HTTP:
                break;
            case DuckDBDataProtocol.NATIVE:
                throw Error('closeFile not implemented');
        }
    },
    truncateFile: (mod: DuckDBModule, fileId: number, newSize: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.data_protocol) {
            case DuckDBDataProtocol.HTTP:
                throw Error('Cannot truncate a HTTP file');
            case DuckDBDataProtocol.NATIVE:
                throw Error('truncateFile not implemented');
        }
        return 0;
    },
    readFile(mod: DuckDBModule, fileId: number, buf: number, bytes: number, location: number) {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.data_protocol) {
            // File reading from BLOB or HTTP MUST be done with range requests.
            // We have to check in OPEN if such file supports range requests and upgrade to BUFFER if not.
            case DuckDBDataProtocol.HTTP: {
                if (!file.data_url) throw new Error(`Missing data URL for file ${fileId}`);
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
                    throw Error(
                        `Range request for ${file.data_url} did not return a partial response: ${xhr.status} "${xhr.statusText}"`,
                    );
                } else {
                    throw Error(
                        `Range request for ${file.data_url} did returned non-success status: ${xhr.status} "${xhr.statusText}"`,
                    );
                }
            }
            case DuckDBDataProtocol.NATIVE: {
                const handle = BROWSER_RUNTIME._files?.get(file.file_name);
                if (!handle) {
                    console.log(BROWSER_RUNTIME._files);
                    throw Error(`No handle available for file: ${file.file_name}`);
                }
                const sliced = handle!.slice(location, location + bytes);
                const data = new Uint8Array(new FileReaderSync().readAsArrayBuffer(sliced));
                mod.HEAPU8.set(data, buf);
                return data.byteLength;
            }
        }
        return 0;
    },
    writeFile: (mod: DuckDBModule, fileId: number, buf: number, bytes: number, location: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.data_protocol) {
            case DuckDBDataProtocol.HTTP:
                throw Error('Cannot write to HTTP file');

            case DuckDBDataProtocol.NATIVE:
                throw Error('writeFile not implemented');
        }
        return 0;
    },
    getFileSize: (mod: DuckDBModule, fileId: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.data_protocol) {
            case DuckDBDataProtocol.NATIVE: {
                const handle = BROWSER_RUNTIME._files?.get(file.file_name);
                if (!handle) {
                    console.log(BROWSER_RUNTIME._files);
                    throw Error(`No handle available for file: ${file.file_name}`);
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
                    throw Error(`HEAD ${file.data_url} returned non-success status: ${xhr.status} "${xhr.statusText}"`);
                }
            }
        }
        return 0;
    },
    getLastFileModificationTime: (mod: DuckDBModule, fileId: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.data_protocol) {
            case DuckDBDataProtocol.NATIVE: {
                const handle = BROWSER_RUNTIME._files?.get(file.file_name);
                if (!handle) {
                    console.log(BROWSER_RUNTIME._files);
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
    glob: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {},
    moveFile: (_mod: DuckDBModule, _fromPtr: number, _fromLen: number, _toPtr: number, _toLen: number) => {},
    checkFile: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {
        return false;
    },
    removeFile: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {},
};

export default BROWSER_RUNTIME;
