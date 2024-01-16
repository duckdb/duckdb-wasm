/// <reference types="emscripten" />
import { DuckDBModule } from './duckdb_module';
import { UDFFunction } from './udf_function';
/** Helper to decode text */
export declare const decodeText: (input?: BufferSource) => string;
/** Copy a buffer */
export declare function failWith(mod: DuckDBModule, msg: string): void;
/** Copy a buffer */
export declare function copyBuffer(mod: DuckDBModule, begin: number, length: number): Uint8Array;
/** Decode a string */
export declare function readString(mod: DuckDBModule, begin: number, length: number): string;
/** The data protocol */
export declare enum DuckDBDataProtocol {
    BUFFER = 0,
    NODE_FS = 1,
    BROWSER_FILEREADER = 2,
    BROWSER_FSACCESS = 3,
    HTTP = 4,
    S3 = 5
}
/** File flags for opening files*/
export declare enum FileFlags {
    FILE_FLAGS_READ = 1,
    FILE_FLAGS_WRITE = 2,
    FILE_FLAGS_DIRECT_IO = 4,
    FILE_FLAGS_FILE_CREATE = 8,
    FILE_FLAGS_FILE_CREATE_NEW = 16,
    FILE_FLAGS_APPEND = 32
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
    allowFullHttpReads?: boolean;
    s3Config?: S3Config;
}
/** Global info for all files registered with DuckDB */
export interface DuckDBGlobalFileInfo {
    cacheEpoch: number;
    allowFullHttpReads?: boolean;
    s3Config?: S3Config;
}
/** Call a function with packed response buffer */
export declare function callSRet(mod: DuckDBModule, funcName: string, argTypes: Array<Emscripten.JSType>, args: Array<any>): [number, number, number];
/** Drop response buffers */
export declare function dropResponseBuffers(mod: DuckDBModule): void;
/** The duckdb runtime */
export interface DuckDBRuntime {
    _files?: Map<string, any>;
    _udfFunctions: Map<number, UDFFunction>;
    testPlatformFeature(mod: DuckDBModule, feature: number): boolean;
    getDefaultDataProtocol(mod: DuckDBModule): number;
    openFile(mod: DuckDBModule, fileId: number, flags: FileFlags): void;
    syncFile(mod: DuckDBModule, fileId: number): void;
    closeFile(mod: DuckDBModule, fileId: number): void;
    getLastFileModificationTime(mod: DuckDBModule, fileId: number): number;
    truncateFile(mod: DuckDBModule, fileId: number, newSize: number): void;
    readFile(mod: DuckDBModule, fileId: number, buffer: number, bytes: number, location: number): number;
    writeFile(mod: DuckDBModule, fileId: number, buffer: number, bytes: number, location: number): number;
    removeDirectory(mod: DuckDBModule, pathPtr: number, pathLen: number): void;
    checkDirectory(mod: DuckDBModule, pathPtr: number, pathLen: number): boolean;
    createDirectory(mod: DuckDBModule, pathPtr: number, pathLen: number): void;
    listDirectoryEntries(mod: DuckDBModule, pathPtr: number, pathLen: number): boolean;
    glob(mod: DuckDBModule, pathPtr: number, pathLen: number): void;
    moveFile(mod: DuckDBModule, fromPtr: number, fromLen: number, toPtr: number, toLen: number): void;
    checkFile(mod: DuckDBModule, pathPtr: number, pathLen: number): boolean;
    removeFile(mod: DuckDBModule, pathPtr: number, pathLen: number): void;
    callScalarUDF(mod: DuckDBModule, response: number, funcId: number, descPtr: number, descSize: number, ptrsPtr: number, ptrsSize: number): void;
}
export declare const DEFAULT_RUNTIME: DuckDBRuntime;
