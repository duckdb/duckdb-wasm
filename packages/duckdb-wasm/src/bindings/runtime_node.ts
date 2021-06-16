import fs from 'fs';
import {
    DuckDBRuntime,
    DuckDBFileInfo,
    callSRet,
    dropResponseBuffers,
    readString,
    decodeText,
    DuckDBDataProtocol,
} from './runtime';
import { StatusCode } from '../status';
import { DuckDBModule } from 'src/targets/duckdb-browser-sync-eh';

export const NODE_RUNTIME: DuckDBRuntime & {
    fileInfoCache: Map<number, DuckDBFileInfo>;

    getFileInfo(mod: DuckDBModule, fileId: number): DuckDBFileInfo;
} = {
    fileInfoCache: new Map<number, DuckDBFileInfo>(),

    getFileInfo(mod: DuckDBModule, fileId: number): DuckDBFileInfo {
        console.log(`getFileInfo ${fileId}`);
        const cached = NODE_RUNTIME.fileInfoCache.get(fileId);
        if (cached) return cached;
        const [s, d, n] = callSRet(mod, 'duckdb_web_fs_get_file_info', ['number'], [fileId]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(mod, d, n));
        }
        const infoStr = readString(mod, d, n);
        dropResponseBuffers(mod);
        const info = JSON.parse(infoStr) as DuckDBFileInfo;
        if (info == null) throw new Error(`Could not resolve file ${fileId}`);
        NODE_RUNTIME.fileInfoCache.set(fileId, info);
        console.log(info);
        return info as DuckDBFileInfo;
    },
    duckdb_web_fs_file_open(mod: DuckDBModule, fileId: number): void {
        console.log(`duckdb_web_fs_file_open ${fileId}`);
        const file = NODE_RUNTIME.getFileInfo(mod, fileId);
        switch (file.data_protocol) {
            case DuckDBDataProtocol.NATIVE: {
                file.data_native_fd = fs.openSync(
                    file.data_url!,
                    fs.constants.O_CREAT | fs.constants.O_RDWR,
                    fs.constants.S_IRUSR | fs.constants.S_IWUSR,
                );
                const [s, d, n] = callSRet(
                    mod,
                    'duckdb_web_fs_set_file_descriptor',
                    ['number', 'number'],
                    [fileId, file.data_native_fd],
                );
                if (s !== StatusCode.SUCCESS) {
                    throw new Error(readString(mod, d, n));
                }
                break;
            }
            case DuckDBDataProtocol.HTTP:
                throw Error('Not implemented');
        }
    },
    duckdb_web_fs_file_sync: (_mod: DuckDBModule, _fileId: number) => {
        console.log(`duckdb_web_fs_file_sync`);
    },
    duckdb_web_fs_file_close: (mod: DuckDBModule, fileId: number) => {
        console.log(`duckdb_web_fs_file_close ${fileId}`);
        const file = NODE_RUNTIME.getFileInfo(mod, fileId);
        switch (file.data_protocol) {
            case DuckDBDataProtocol.NATIVE: {
                if (!file.data_native_fd) {
                    throw Error(`File ${fileId} is missing a file descriptor`);
                }
                fs.closeSync(file.data_native_fd);
                NODE_RUNTIME.fileInfoCache.delete(file.data_native_fd);
                file.data_native_fd = null;
                break;
            }
            case DuckDBDataProtocol.HTTP:
                throw Error('Not implemented');
        }
        return 0;
    },
    duckdb_web_fs_file_truncate: (mod: DuckDBModule, fileId: number, newSize: number) => {
        console.log(`duckdb_web_fs_file_truncate ${fileId}`);
        const file = NODE_RUNTIME.getFileInfo(mod, fileId);
        switch (file.data_protocol) {
            case DuckDBDataProtocol.NATIVE: {
                if (!file.data_native_fd) {
                    throw Error(`File ${fileId} is missing a file descriptor`);
                }
                fs.truncateSync(file.data_url!, newSize);
                break;
            }
            case DuckDBDataProtocol.HTTP:
                throw Error('Not Implemented');
        }
    },
    duckdb_web_fs_file_read: (mod: DuckDBModule, fileId: number, buf: number, bytes: number, location: number) => {
        console.log(`duckdb_web_fs_file_read ${fileId}`);
        const file = NODE_RUNTIME.getFileInfo(mod, fileId);
        switch (file.data_protocol) {
            case DuckDBDataProtocol.NATIVE: {
                if (!file.data_native_fd) {
                    throw Error(`File ${fileId} is missing a file descriptor`);
                }
                return fs.readSync(file.data_native_fd!, mod.HEAPU8, buf, bytes, location);
            }
            case DuckDBDataProtocol.HTTP:
                throw Error('Not implemented');
        }
        return 0;
    },
    duckdb_web_fs_file_write: (mod: DuckDBModule, fileId: number, buf: number, bytes: number, location: number) => {
        console.log(`duckdb_web_fs_file_write ${fileId}`);
        const file = NODE_RUNTIME.getFileInfo(mod, fileId);
        switch (file.data_protocol) {
            case DuckDBDataProtocol.NATIVE: {
                if (!file.data_native_fd) {
                    throw Error(`File ${fileId} is missing a file descriptor`);
                }
                const src = mod.HEAPU8.subarray(buf, buf + bytes);
                return fs.writeSync(file.data_native_fd!, src, 0, src.length, location);
            }
            case DuckDBDataProtocol.BUFFER:
                throw Error('Not implemented');
        }
        return 0;
    },
    duckdb_web_fs_file_get_size: (mod: DuckDBModule, fileId: number): number => {
        console.log(`duckdb_web_fs_file_get_size ${fileId}`);
        const file = NODE_RUNTIME.getFileInfo(mod, fileId);
        switch (file.data_protocol) {
            case DuckDBDataProtocol.NATIVE: {
                if (!file.data_native_fd) {
                    throw Error(`File ${fileId} is missing a file descriptor`);
                }
                return fs.fstatSync(file.data_native_fd!).size;
            }
            case DuckDBDataProtocol.HTTP:
                throw Error('Not implemented');
        }
        return 0;
    },
    duckdb_web_fs_file_get_last_modified_time: (mod: DuckDBModule, fileId: number) => {
        console.log(`duckdb_web_fs_file_get_last_modified_time ${fileId}`);
        const file = NODE_RUNTIME.getFileInfo(mod, fileId);
        switch (file.data_protocol) {
            case DuckDBDataProtocol.NATIVE: {
                if (!file.data_native_fd) {
                    throw Error(`File ${fileId} is missing a file descriptor`);
                }
                return fs.fstatSync(file.data_native_fd!).mtime.getTime();
            }
            case DuckDBDataProtocol.HTTP:
                throw Error('Not Implemented');
        }
        return 0;
    },

    duckdb_web_fs_directory_exists: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        const path = decodeText(mod.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        return fs.existsSync(path);
    },
    duckdb_web_fs_directory_create: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        const path = decodeText(mod.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        return fs.mkdirSync(path);
    },
    duckdb_web_fs_directory_remove: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        const path = decodeText(mod.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        return fs.rmdirSync(path);
    },
    duckdb_web_fs_directory_list_files: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {
        throw Error('Not Implemented');
    },
    duckdb_web_fs_glob: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {},
    duckdb_web_fs_file_move: (mod: DuckDBModule, fromPtr: number, fromLen: number, toPtr: number, toLen: number) => {
        const from = decodeText(mod.HEAPU8.subarray(fromPtr, fromPtr + fromLen));
        const to = decodeText(mod.HEAPU8.subarray(toPtr, toPtr + toLen));
        return fs.renameSync(from, to);
    },
    duckdb_web_fs_file_exists: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        const path = decodeText(mod.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        return fs.existsSync(path);
    },
    duckdb_web_fs_file_remove: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        const path = decodeText(mod.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        return fs.rmSync(path);
    },
};

export default NODE_RUNTIME;
