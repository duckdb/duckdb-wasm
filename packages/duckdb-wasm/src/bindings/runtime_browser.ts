import { StatusCode } from '../status';
import {
    DuckDBRuntime,
    DuckDBFileInfo,
    callSRet,
    dropResponseBuffers,
    readString,
    DuckDBDataProtocol,
} from './runtime';
import { DuckDBModule } from 'src/targets/duckdb-browser-sync-eh';

type ExtendedFileInfo = DuckDBFileInfo & {
    blob: Blob | null;
};

function resolveBlob(file: ExtendedFileInfo): Blob {
    if (file.blob) return file.blob;
    if (!file.data_url) {
        throw new Error(`Missing data object URL: ${file.file_id}`);
    }
    const xhr = new XMLHttpRequest();
    xhr.open('GET', file.data_url, false);
    xhr.responseType = 'blob';
    xhr.send(null);
    if (xhr.status !== 200) {
        throw new Error(`Could not resolve blob: ${file.data_url}`);
    }
    file.blob = xhr.response as Blob;
    return file.blob;
}

export const BROWSER_RUNTIME: DuckDBRuntime & {
    fileInfoCache: Map<number, ExtendedFileInfo>;

    getFileInfo(mod: DuckDBModule, fileId: number): ExtendedFileInfo | null;
} = {
    fileInfoCache: new Map<number, ExtendedFileInfo>(),

    getFileInfo(mod: DuckDBModule, fileId: number): ExtendedFileInfo | null {
        const cached = BROWSER_RUNTIME.fileInfoCache.get(fileId);
        if (cached) return cached;
        const [s, d, n] = callSRet(mod, 'duckdb_web_fs_get_file_info', ['number'], [fileId]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(mod, d, n));
        }
        const infoStr = readString(mod, d, n);
        dropResponseBuffers(mod);
        const info = JSON.parse(infoStr);
        if (info == null) return null;
        return { ...info, blob: null } as ExtendedFileInfo;
    },

    openFile: (mod: DuckDBModule, fileId: number) => {
        console.log(mod);
        BROWSER_RUNTIME.fileInfoCache.delete(fileId);
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.data_protocol) {
            case DuckDBDataProtocol.HTTP:
                // XXX could fire a HEAD request here to get the file size and check whether the file is accessible
                break;
            case DuckDBDataProtocol.BLOB:
            case DuckDBDataProtocol.NATIVE:
                break;
        }
    },
    syncFile: (_mod: DuckDBModule, _fileId: number) => {},
    closeFile: (mod: DuckDBModule, fileId: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        BROWSER_RUNTIME.fileInfoCache.delete(fileId);
        switch (file?.data_protocol) {
            case DuckDBDataProtocol.BLOB:
                if (!file.data_url) return;
                file.data_url = null;
                break;
            case DuckDBDataProtocol.HTTP:
                break;
            case DuckDBDataProtocol.NATIVE:
                throw Error('Not implemented');
        }
    },
    truncateFile: (mod: DuckDBModule, fileId: number, newSize: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.data_protocol) {
            case DuckDBDataProtocol.BLOB:
                throw Error('Cannot truncate a BLOB');
            case DuckDBDataProtocol.HTTP:
                throw Error('Cannot truncate a HTTP file');
            case DuckDBDataProtocol.NATIVE:
                throw Error('Not implemented');
        }
        return 0;
    },
    readFile(mod: DuckDBModule, fileId: number, buf: number, bytes: number, location: number) {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.data_protocol) {
            case DuckDBDataProtocol.BLOB: {
                const blob = resolveBlob(file);
                const slice = blob.slice(location, location + bytes);
                const src = new Uint8Array(new FileReaderSync().readAsArrayBuffer(slice));
                mod.HEAPU8.set(src, buf);
                return src.byteLength;
            }
            case DuckDBDataProtocol.HTTP: {
                if (!file.data_url) throw new Error(`Missing data URL for file ${fileId}`);
                const xhr = new XMLHttpRequest();
                xhr.open('GET', file.data_url!, false);
                xhr.responseType = 'arraybuffer';
                xhr.setRequestHeader('Range', `bytes=${location}-${location + bytes - 1}`);
                xhr.send(null);
                if (xhr.status == 206 /* Partial content */) {
                    const src = new Uint8Array(xhr.response);
                    mod.HEAPU8.set(src, buf);
                    return src.byteLength;
                } else {
                    throw Error(
                        `Range request for ${file.data_url} returned non-success status: ${xhr.status} "${xhr.statusText}"`,
                    );
                }
            }
            case DuckDBDataProtocol.NATIVE:
                throw Error('Not implemented');
        }
        return 0;
    },
    writeFile: (mod: DuckDBModule, fileId: number, buf: number, bytes: number, location: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.data_protocol) {
            case DuckDBDataProtocol.BLOB:
                throw Error('Cannot write to BLOB');
            case DuckDBDataProtocol.HTTP:
                throw Error('Cannot write to HTTP file');

            case DuckDBDataProtocol.NATIVE:
                throw Error('Not implemented');
        }
        return 0;
    },
    getFileSize: (mod: DuckDBModule, fileId: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.data_protocol) {
            case DuckDBDataProtocol.NATIVE:
                throw Error('Not implemented');

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

            case DuckDBDataProtocol.BLOB: {
                const blob = resolveBlob(file);
                return blob.size;
            }
        }
        return 0;
    },
    getLastFileModificationTime: (mod: DuckDBModule, fileId: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file?.data_protocol) {
            case DuckDBDataProtocol.NATIVE:
                throw Error('Not implemented');

            case DuckDBDataProtocol.HTTP:
                return new Date().getTime();
            case DuckDBDataProtocol.BLOB:
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
