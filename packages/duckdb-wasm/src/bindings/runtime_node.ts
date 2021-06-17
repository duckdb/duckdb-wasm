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

    resolveFileInfo(mod: DuckDBModule, fileId: number): DuckDBFileInfo | null;
} = {
    fileInfoCache: new Map<number, DuckDBFileInfo>(),

    resolveFileInfo(mod: DuckDBModule, fileId: number): DuckDBFileInfo | null {
        const cached = NODE_RUNTIME.fileInfoCache.get(fileId);
        if (cached) return cached;
        const [s, d, n] = callSRet(mod, 'duckdb_web_fs_get_file_info', ['number'], [fileId]);
        if (s !== StatusCode.SUCCESS) {
            throw new Error(readString(mod, d, n));
        }
        const infoStr = readString(mod, d, n);
        dropResponseBuffers(mod);
        const info = JSON.parse(infoStr) as DuckDBFileInfo;
        if (info == null) return null;
        NODE_RUNTIME.fileInfoCache.set(fileId, info);
        return info as DuckDBFileInfo;
    },
    openFile(mod: DuckDBModule, fileId: number): void {
        NODE_RUNTIME.fileInfoCache.delete(fileId);
        const file = NODE_RUNTIME.resolveFileInfo(mod, fileId);
        switch (file?.data_protocol) {
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
    syncFile: (_mod: DuckDBModule, _fileId: number) => {},
    closeFile: (mod: DuckDBModule, fileId: number) => {
        const file = NODE_RUNTIME.resolveFileInfo(mod, fileId);
        NODE_RUNTIME.fileInfoCache.delete(fileId);
        switch (file?.data_protocol) {
            case DuckDBDataProtocol.NATIVE: {
                if (!file.data_native_fd) {
                    throw Error(`File ${fileId} is missing a file descriptor`);
                }
                fs.closeSync(file.data_native_fd);
                file.data_native_fd = null;
                break;
            }
            case DuckDBDataProtocol.HTTP:
                throw Error('Not implemented');
        }
        return 0;
    },
    truncateFile: (mod: DuckDBModule, fileId: number, newSize: number) => {
        const file = NODE_RUNTIME.resolveFileInfo(mod, fileId);
        switch (file?.data_protocol) {
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
    readFile: (mod: DuckDBModule, fileId: number, buf: number, bytes: number, location: number) => {
        const file = NODE_RUNTIME.resolveFileInfo(mod, fileId);
        switch (file?.data_protocol) {
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
    writeFile: (mod: DuckDBModule, fileId: number, buf: number, bytes: number, location: number) => {
        const file = NODE_RUNTIME.resolveFileInfo(mod, fileId);
        switch (file?.data_protocol) {
            case DuckDBDataProtocol.NATIVE: {
                if (!file.data_native_fd) {
                    throw Error(`File ${fileId} is missing a file descriptor`);
                }
                const src = mod.HEAPU8.subarray(buf, buf + bytes);
                return fs.writeSync(file.data_native_fd!, src, 0, src.length, location);
            }
        }
        return 0;
    },
    getFileSize: (mod: DuckDBModule, fileId: number): number => {
        const file = NODE_RUNTIME.resolveFileInfo(mod, fileId);
        switch (file?.data_protocol) {
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
    getLastFileModificationTime: (mod: DuckDBModule, fileId: number) => {
        const file = NODE_RUNTIME.resolveFileInfo(mod, fileId);
        switch (file?.data_protocol) {
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

    checkDirectory: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        const path = decodeText(mod.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        return fs.existsSync(path);
    },
    createDirectory: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        const path = decodeText(mod.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        return fs.mkdirSync(path);
    },
    removeDirectory: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        const path = decodeText(mod.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        return fs.rmdirSync(path);
    },
    listDirectoryEntries: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {
        throw Error('Not Implemented');
    },
    glob: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {},
    moveFile: (mod: DuckDBModule, fromPtr: number, fromLen: number, toPtr: number, toLen: number) => {
        const from = decodeText(mod.HEAPU8.subarray(fromPtr, fromPtr + fromLen));
        const to = decodeText(mod.HEAPU8.subarray(toPtr, toPtr + toLen));
        return fs.renameSync(from, to);
    },
    checkFile: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        const path = decodeText(mod.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        return fs.existsSync(path);
    },
    removeFile: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        const path = decodeText(mod.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        return fs.rmSync(path);
    },
};

export default NODE_RUNTIME;
