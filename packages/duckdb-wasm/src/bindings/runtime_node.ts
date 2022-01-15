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
import * as fg from 'fast-glob';
import * as udf from './udf_runtime';

export const NODE_RUNTIME: DuckDBRuntime & {
    _fileInfoCache: Map<number, DuckDBFileInfo>;

    resolveFileInfo(mod: DuckDBModule, fileId: number): DuckDBFileInfo | null;
} = {
    _files: new Map<string, any>(),
    _fileInfoCache: new Map<number, DuckDBFileInfo>(),

    resolveFileInfo(mod: DuckDBModule, fileId: number): DuckDBFileInfo | null {
        try {
            const cached = NODE_RUNTIME._fileInfoCache.get(fileId);
            if (cached) return cached;
            const [s, d, n] = callSRet(mod, 'duckdb_web_fs_get_file_info_by_id', ['number'], [fileId]);
            if (s !== StatusCode.SUCCESS) {
                failWith(mod, readString(mod, d, n));
                return null;
            }
            const infoStr = readString(mod, d, n);
            dropResponseBuffers(mod);
            const info = JSON.parse(infoStr) as DuckDBFileInfo;
            if (info == null) return null;
            NODE_RUNTIME._fileInfoCache.set(fileId, info);
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
            NODE_RUNTIME._fileInfoCache.delete(fileId);
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
            NODE_RUNTIME._fileInfoCache.delete(fileId);
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
    glob: (mod: DuckDBModule, pathPtr: number, pathLen: number) => {
        try {
            const path = readString(mod, pathPtr, pathLen);
            const entries = fg.sync([path], { dot: true });
            for (const entry of entries) {
                mod.ccall('duckdb_web_fs_glob_add_path', null, ['string'], [entry]);
            }
        } catch (e: any) {
            failWith(mod, e.toString());
            return 0;
        }
    },
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
    callScalarUDF: (mod: DuckDBModule, connId: number, funcId: number, bufferPtr: number, bufferSize: number): void => {
        udf.callScalarUDF(NODE_RUNTIME, mod, connId, funcId, bufferPtr, bufferSize);
    },
};

export default NODE_RUNTIME;
