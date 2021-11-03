import fs from 'fs';
import {
    DuckDBRuntime,
    DuckDBFileInfo,
    callSRet,
    dropResponseBuffers,
    failWith,
    readString,
    decodeText,
    DuckDBDataProtocol,
} from './runtime';
import { StatusCode } from '../status';
import { DuckDBModule } from './duckdb_module';

export const NODE_RUNTIME: DuckDBRuntime & {
    fileInfoCache: Map<number, DuckDBFileInfo>;

    resolveFileInfo(mod: DuckDBModule, fileId: number): DuckDBFileInfo | null;
} = {
    fileInfoCache: new Map<number, DuckDBFileInfo>(),

    resolveFileInfo(mod: DuckDBModule, fileId: number): DuckDBFileInfo | null {
        try {
            const cached = NODE_RUNTIME.fileInfoCache.get(fileId);
            if (cached) return cached;
            const [s, d, n] = callSRet(mod, 'duckdb_web_fs_get_file_info', ['number'], [fileId]);
            if (s !== StatusCode.SUCCESS) {
                failWith(mod, readString(mod, d, n));
                return null;
            }
            const infoStr = readString(mod, d, n);
            dropResponseBuffers(mod);
            const info = JSON.parse(infoStr) as DuckDBFileInfo;
            if (info == null) return null;
            NODE_RUNTIME.fileInfoCache.set(fileId, info);
            return info as DuckDBFileInfo;
        } catch (e: any) {
            failWith(mod, e.toString());
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

    openFile(mod: DuckDBModule, fileId: number): number {
        try {
            NODE_RUNTIME.fileInfoCache.delete(fileId);
            const file = NODE_RUNTIME.resolveFileInfo(mod, fileId);
            switch (file?.dataProtocol) {
                // Native file
                case DuckDBDataProtocol.NATIVE: {
                    file.dataNativeFd = fs.openSync(
                        file.dataUrl!,
                        fs.constants.O_CREAT | fs.constants.O_RDWR,
                        fs.constants.S_IRUSR | fs.constants.S_IWUSR,
                    );
                    const [s, d, n] = callSRet(
                        mod,
                        'duckdb_web_fs_set_file_descriptor',
                        ['number', 'number'],
                        [fileId, file.dataNativeFd],
                    );
                    if (s !== StatusCode.SUCCESS) {
                        failWith(mod, readString(mod, d, n));
                    }
                    const fileSize = fs.fstatSync(file.dataNativeFd!).size;
                    const result = mod._malloc(2 * 8);
                    mod.HEAPF64[(result >> 3) + 0] = +fileSize;
                    mod.HEAPF64[(result >> 3) + 1] = 0;
                    return result;
                }
                // HTTP file
                case DuckDBDataProtocol.HTTP:
                    failWith(mod, 'Not implemented');
            }
        } catch (e: any) {
            failWith(mod, e.toString());
        }
        return 0;
    },
    syncFile: (_mod: DuckDBModule, _fileId: number) => {},
    closeFile: (mod: DuckDBModule, fileId: number) => {
        try {
            const file = NODE_RUNTIME.resolveFileInfo(mod, fileId);
            NODE_RUNTIME.fileInfoCache.delete(fileId);
            switch (file?.dataProtocol) {
                case DuckDBDataProtocol.NATIVE: {
                    if (!file.dataNativeFd) {
                        failWith(mod, `File ${fileId} is missing a file descriptor`);
                        return 0;
                    }
                    fs.closeSync(file.dataNativeFd);
                    file.dataNativeFd = null;
                    break;
                }
                case DuckDBDataProtocol.HTTP:
                    failWith(mod, `Not implemented`);
            }
        } catch (e: any) {
            failWith(mod, e.toString());
        }
        return 0;
    },
    truncateFile: (mod: DuckDBModule, fileId: number, newSize: number) => {
        try {
            const file = NODE_RUNTIME.resolveFileInfo(mod, fileId);
            switch (file?.dataProtocol) {
                case DuckDBDataProtocol.NATIVE: {
                    if (!file.dataNativeFd) {
                        failWith(mod, `File ${fileId} is missing a file descriptor`);
                        return 0;
                    }
                    fs.truncateSync(file.dataUrl!, newSize);
                    break;
                }
                case DuckDBDataProtocol.HTTP:
                    failWith(mod, `Not implemented`);
            }
        } catch (e: any) {
            failWith(mod, e.toString());
        }
        return 0;
    },
    readFile: (mod: DuckDBModule, fileId: number, buf: number, bytes: number, location: number) => {
        try {
            const file = NODE_RUNTIME.resolveFileInfo(mod, fileId);
            switch (file?.dataProtocol) {
                case DuckDBDataProtocol.NATIVE: {
                    if (!file.dataNativeFd) {
                        failWith(mod, `File ${fileId} is missing a file descriptor`);
                        return 0;
                    }
                    return fs.readSync(file.dataNativeFd!, mod.HEAPU8, buf, bytes, location);
                }
                case DuckDBDataProtocol.HTTP:
                    failWith(mod, `Not implemented`);
            }
        } catch (e: any) {
            failWith(mod, e.toString());
        }
        return 0;
    },
    writeFile: (mod: DuckDBModule, fileId: number, buf: number, bytes: number, location: number) => {
        try {
            const file = NODE_RUNTIME.resolveFileInfo(mod, fileId);
            switch (file?.dataProtocol) {
                case DuckDBDataProtocol.NATIVE: {
                    if (!file.dataNativeFd) {
                        failWith(mod, `File ${fileId} is missing a file descriptor`);
                        return 0;
                    }
                    const src = mod.HEAPU8.subarray(buf, buf + bytes);
                    return fs.writeSync(file.dataNativeFd!, src, 0, src.length, location);
                }
            }
        } catch (e: any) {
            failWith(mod, e.toString());
        }
        return 0;
    },
    getLastFileModificationTime: (mod: DuckDBModule, fileId: number) => {
        try {
            const file = NODE_RUNTIME.resolveFileInfo(mod, fileId);
            switch (file?.dataProtocol) {
                case DuckDBDataProtocol.NATIVE: {
                    if (!file.dataNativeFd) {
                        failWith(mod, `File ${fileId} is missing a file descriptor`);
                        return 0;
                    }
                    return fs.fstatSync(file.dataNativeFd!).mtime.getTime();
                }
                case DuckDBDataProtocol.HTTP:
                    failWith(mod, 'Not implemented');
            }
        } catch (e: any) {
            failWith(mod, e.toString());
        }
        return 0;
    },

    checkDirectory: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        try {
            const path = decodeText(mod.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
            return fs.existsSync(path);
        } catch (e: any) {
            failWith(mod, e.toString());
            return false;
        }
    },
    createDirectory: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        try {
            const path = decodeText(mod.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
            return fs.mkdirSync(path);
        } catch (e: any) {
            failWith(mod, e.toString());
            return 0;
        }
    },
    removeDirectory: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        try {
            const path = decodeText(mod.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
            return fs.rmdirSync(path);
        } catch (e: any) {
            failWith(mod, e.toString());
            return 0;
        }
    },
    listDirectoryEntries: (mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {
        failWith(mod, 'Not Implemented');
        return false;
    },
    glob: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number) => {},
    moveFile: (mod: DuckDBModule, fromPtr: number, fromLen: number, toPtr: number, toLen: number) => {
        try {
            const from = decodeText(mod.HEAPU8.subarray(fromPtr, fromPtr + fromLen));
            const to = decodeText(mod.HEAPU8.subarray(toPtr, toPtr + toLen));
            return fs.renameSync(from, to);
        } catch (e: any) {
            failWith(mod, e.toString());
            return 0;
        }
    },
    checkFile: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        try {
            const path = decodeText(mod.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
            return fs.existsSync(path);
        } catch (e: any) {
            failWith(mod, e.toString());
            return false;
        }
    },
    removeFile: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        try {
            const path = decodeText(mod.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
            return fs.rmSync(path);
        } catch (e: any) {
            failWith(mod, e.toString());
            return 0;
        }
    },
};

export default NODE_RUNTIME;
