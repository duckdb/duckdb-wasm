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

    getFileInfo(mod: DuckDBModule, fileId: number): ExtendedFileInfo;
} = {
    fileInfoCache: new Map<number, ExtendedFileInfo>(),

    getFileInfo(mod: DuckDBModule, fileId: number): ExtendedFileInfo {
        const cached = BROWSER_RUNTIME.fileInfoCache.get(fileId);
        if (cached) return cached;
        const [s, d, n] = callSRet(mod, 'duckdb_web_fs_get_file_info', ['number'], [fileId]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(mod, d, n));
        }
        const infoStr = readString(mod, d, n);
        dropResponseBuffers(mod);
        const info = JSON.parse(infoStr);
        if (info == null) throw new Error(`Could not resolve file ${fileId}`);
        return { ...info, blob: null } as ExtendedFileInfo;
    },

    duckdb_web_fs_file_open: (mod: DuckDBModule, fileId: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file.data_protocol) {
            case DuckDBDataProtocol.HTTP:
            case DuckDBDataProtocol.NATIVE:
                throw Error('Not implemented');
        }
    },
    duckdb_web_fs_file_sync: (_mod: DuckDBModule, _fileId: number) => {},
    duckdb_web_fs_file_close: (mod: DuckDBModule, fileId: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file.data_protocol) {
            case DuckDBDataProtocol.BLOB:
                if (!file.data_url) throw new Error(`Missing data URL for file ${fileId}`);
                URL.revokeObjectURL(file.data_url);
                file.data_url = null;
                break;
            case DuckDBDataProtocol.NATIVE:
                throw Error('Not implemented');
        }
    },
    duckdb_web_fs_file_truncate: (mod: DuckDBModule, fileId: number, newSize: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file.data_protocol) {
            case DuckDBDataProtocol.NATIVE:
            case DuckDBDataProtocol.HTTP:
                throw Error('Not implemented');
        }
        return 0;
    },
    duckdb_web_fs_file_read(mod: DuckDBModule, fileId: number, buf: number, bytes: number, location: number) {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file.data_protocol) {
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
    duckdb_web_fs_file_write: (mod: DuckDBModule, fileId: number, buf: number, bytes: number, location: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file.data_protocol) {
            case DuckDBDataProtocol.NATIVE:
                throw Error('Not implemented');
        }
        return 0;
    },
    duckdb_web_fs_file_get_size: (mod: DuckDBModule, fileId: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file.data_protocol) {
            case DuckDBDataProtocol.NATIVE:
            case DuckDBDataProtocol.HTTP:
                throw Error('Not implemented');
        }
        return 0;
    },
    duckdb_web_fs_file_get_last_modified_time: (mod: DuckDBModule, fileId: number) => {
        const file = BROWSER_RUNTIME.getFileInfo(mod, fileId);
        switch (file.data_protocol) {
            case DuckDBDataProtocol.NATIVE:
            case DuckDBDataProtocol.HTTP:
                throw Error('Not implemented');
        }
        return 0;
    },
    duckdb_web_fs_directory_exists: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => false,
    duckdb_web_fs_directory_create: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {},
    duckdb_web_fs_directory_remove: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {},
    duckdb_web_fs_directory_list_files: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => false,
    duckdb_web_fs_glob: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {},
    duckdb_web_fs_file_move: (
        _mod: DuckDBModule,
        _fromPtr: number,
        _fromLen: number,
        _toPtr: number,
        _toLen: number,
    ) => {},
    duckdb_web_fs_file_exists: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {
        return false;
    },
    duckdb_web_fs_file_remove: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {},
};

export default BROWSER_RUNTIME;
