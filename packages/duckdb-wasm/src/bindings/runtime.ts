import { DuckDBModule } from './duckdb_module';
import { UDFFunction } from './udf_function';
import * as udf_rt from './udf_runtime';

/** Wrapper for TextDecoder to support shared array buffers */
function TextDecoderWrapper(): (input?: BufferSource) => string {
    const decoder = new TextDecoder();
    return (data: any) => {
        if (typeof SharedArrayBuffer !== 'undefined' && data.buffer instanceof SharedArrayBuffer) {
            data = new Uint8Array(data);
        }
        return decoder.decode(data);
    };
}
/** Helper to decode text */
export const decodeText = TextDecoderWrapper();

/** Copy a buffer */
export function failWith(mod: DuckDBModule, msg: string): void {
    console.error(`FAIL WITH: ${msg}`);
    mod.ccall('duckdb_web_fail_with', null, ['string'], [msg]);
}

/** Copy a buffer */
export function copyBuffer(mod: DuckDBModule, begin: number, length: number): Uint8Array {
    const buffer = mod.HEAPU8.subarray(begin, begin + length);
    const copy = new Uint8Array(new ArrayBuffer(buffer.byteLength));
    copy.set(buffer);
    return copy;
}

/** Decode a string */
export function readString(mod: DuckDBModule, begin: number, length: number): string {
    return decodeText(mod.HEAPU8.subarray(begin, begin + length));
}

/** The data protocol */
export enum DuckDBDataProtocol {
    BUFFER = 0,
    NODE_FS = 1,
    BROWSER_FILEREADER = 2,
    BROWSER_FSACCESS = 3,
    HTTP = 4,
    S3 = 5,
}

/** File flags for opening files*/
export enum FileFlags {
    //! Open file with read access
    FILE_FLAGS_READ = 1 << 0,
    //! Open file with write access
    FILE_FLAGS_WRITE = 1 << 1,
    //! Use direct IO when reading/writing to the file
    FILE_FLAGS_DIRECT_IO = 1 << 2,
    //! Create file if not exists, can only be used together with WRITE
    FILE_FLAGS_FILE_CREATE = 1 << 3,
    //! Always create a new file. If a file exists, the file is truncated. Cannot be used together with CREATE.
    FILE_FLAGS_FILE_CREATE_NEW = 1 << 4,
    //! Open file in append mode
    FILE_FLAGS_APPEND = 1 << 5,
    FILE_FLAGS_PRIVATE = 1 << 6,
    FILE_FLAGS_NULL_IF_NOT_EXISTS = 1 << 7,
    FILE_FLAGS_PARALLEL_ACCESS = 1 << 8,
    FILE_FLAGS_EXCLUSIVE_CREATE = 1 << 9,
    FILE_FLAGS_NULL_IF_EXISTS = 1 << 10
}

/** Configuration for the AWS S3 Filesystem */
export interface S3Config {
    region?: string;
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
}

/** An info for a file registered with DuckDB */
export interface DuckDBFileInfo {
    cacheEpoch: number;
    fileId: number;
    fileName: string;
    dataProtocol: DuckDBDataProtocol;
    dataUrl: string | null;
    reliableHeadRequests?: boolean;
    allowFullHttpReads?: boolean;
    s3Config?: S3Config;
}

/** Global info for all files registered with DuckDB */
export interface DuckDBGlobalFileInfo {
    cacheEpoch: number;
    reliableHeadRequests?: boolean;
    allowFullHttpReads?: boolean;
    s3Config?: S3Config;
}

export interface PreparedDBFileHandle {
    path: string;
    handle: any;
    fromCached: boolean;
}

/** Call a function with packed response buffer */
export function callSRet(
    mod: DuckDBModule,
    funcName: string,
    argTypes: Array<Emscripten.JSType>,
    args: Array<any>,
): [number, number, number] {
    const stackPointer = mod.stackSave();

    // Allocate the packed response buffer
    const response = mod.stackAlloc(3 * 8);
    argTypes.unshift('number');
    args.unshift(response);

    // Do the call
    mod.ccall(funcName, null, argTypes, args);

    // Read the response
    const status = mod.HEAPF64[(response >> 3) + 0];
    const data = mod.HEAPF64[(response >> 3) + 1];
    const dataSize = mod.HEAPF64[(response >> 3) + 2];

    // Restore the stack
    mod.stackRestore(stackPointer);
    return [status, data, dataSize];
}

/** Drop response buffers */
export function dropResponseBuffers(mod: DuckDBModule): void {
    mod.ccall('duckdb_web_clear_response', null, [], []);
}

/** The duckdb runtime */
export interface DuckDBRuntime {
    _files?: Map<string, any>;
    _udfFunctions: Map<number, UDFFunction>;

    // Test a platform feature
    testPlatformFeature(mod: DuckDBModule, feature: number): boolean;

    // File APIs with dedicated file identifier
    getDefaultDataProtocol(mod: DuckDBModule): number;
    openFile(mod: DuckDBModule, fileId: number, flags: FileFlags): void;
    syncFile(mod: DuckDBModule, fileId: number): void;
    closeFile(mod: DuckDBModule, fileId: number): void;
    dropFile(mod: DuckDBModule, fileNamePtr: number, fileNameLen: number): void;
    getLastFileModificationTime(mod: DuckDBModule, fileId: number): number;
    truncateFile(mod: DuckDBModule, fileId: number, newSize: number): void;
    readFile(mod: DuckDBModule, fileId: number, buffer: number, bytes: number, location: number): number;
    writeFile(mod: DuckDBModule, fileId: number, buffer: number, bytes: number, location: number): number;

    // File APIs with path parameter
    removeDirectory(mod: DuckDBModule, pathPtr: number, pathLen: number): void;
    checkDirectory(mod: DuckDBModule, pathPtr: number, pathLen: number): boolean;
    createDirectory(mod: DuckDBModule, pathPtr: number, pathLen: number): void;
    listDirectoryEntries(mod: DuckDBModule, pathPtr: number, pathLen: number): boolean;
    glob(mod: DuckDBModule, pathPtr: number, pathLen: number): void;
    moveFile(mod: DuckDBModule, fromPtr: number, fromLen: number, toPtr: number, toLen: number): void;
    checkFile(mod: DuckDBModule, pathPtr: number, pathLen: number): boolean;
    removeFile(mod: DuckDBModule, pathPtr: number, pathLen: number): void;

    // Prepare a file handle that could only be acquired aschronously
    prepareFileHandle?: (path: string, protocol: DuckDBDataProtocol) => Promise<PreparedDBFileHandle[]>;
    prepareFileHandles?: (path: string[], protocol: DuckDBDataProtocol) => Promise<PreparedDBFileHandle[]>;
    prepareDBFileHandle?: (path: string, protocol: DuckDBDataProtocol) => Promise<PreparedDBFileHandle[]>;

    // Internal API - experimental
    progressUpdate(final: number, percentage: number, iteration: number): void;

    // Call a scalar UDF function
    callScalarUDF(
        mod: DuckDBModule,
        response: number,
        funcId: number,
        descPtr: number,
        descSize: number,
        ptrsPtr: number,
        ptrsSize: number,
    ): void;
}

export const DEFAULT_RUNTIME: DuckDBRuntime = {
    _udfFunctions: new Map(),

    testPlatformFeature: (_mod: DuckDBModule, _feature: number): boolean => false,
    getDefaultDataProtocol: (_mod: DuckDBModule): number => DuckDBDataProtocol.BUFFER,
    openFile: (_mod: DuckDBModule, _fileId: number, flags: FileFlags): void => {},
    syncFile: (_mod: DuckDBModule, _fileId: number): void => {},
    closeFile: (_mod: DuckDBModule, _fileId: number): void => {},
    dropFile: (_mod: DuckDBModule, _fileNamePtr: number, _fileNameLen: number): void => {},
    getLastFileModificationTime: (_mod: DuckDBModule, _fileId: number): number => {
        return 0;
    },
    progressUpdate: (_final: number, _percentage: number, _iteration: number): void => {
        return;
    },
    truncateFile: (_mod: DuckDBModule, _fileId: number, _newSize: number): void => {},
    readFile: (_mod: DuckDBModule, _fileId: number, _buffer: number, _bytes: number, _location: number): number => {
        return 0;
    },
    writeFile: (_mod: DuckDBModule, _fileId: number, _buffer: number, _bytes: number, _location: number): number => {
        return 0;
    },

    removeDirectory: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number): void => {},
    checkDirectory: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number): boolean => {
        return false;
    },
    createDirectory: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number): void => {},
    listDirectoryEntries: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number): boolean => {
        return false;
    },
    glob: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number): void => {},
    moveFile: (_mod: DuckDBModule, _fromPtr: number, _fromLen: number, _toPtr: number, _toLen: number): void => {},
    checkFile: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number): boolean => {
        return false;
    },
    removeFile: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number): void => {},
    callScalarUDF: (
        mod: DuckDBModule,
        response: number,
        funcId: number,
        descPtr: number,
        descSize: number,
        ptrsPtr: number,
        ptrsSize: number,
    ): void => {
        udf_rt.callScalarUDF(DEFAULT_RUNTIME, mod, response, funcId, descPtr, descSize, ptrsPtr, ptrsSize);
    },
};
