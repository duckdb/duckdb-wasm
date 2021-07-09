import { DuckDBModule } from './duckdb_module';

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
    NATIVE = 1,
    HTTP = 3,
}

/** An info for a file registered with DuckDB */
export interface DuckDBFileInfo {
    file_id: number;
    file_name: string;
    data_protocol: DuckDBDataProtocol;
    data_url: string | null;
    data_native_fd: number | null;
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

    // File APIs with dedicated file identifier
    openFile(mod: DuckDBModule, fileId: number): void;
    syncFile(mod: DuckDBModule, fileId: number): void;
    closeFile(mod: DuckDBModule, fileId: number): void;
    getLastFileModificationTime(mod: DuckDBModule, fileId: number): number;
    getFileSize(mod: DuckDBModule, fileId: number): number;
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
}

export const DEFAULT_RUNTIME: DuckDBRuntime = {
    openFile: (_mod: DuckDBModule, _fileId: number): void => {},
    syncFile: (_mod: DuckDBModule, _fileId: number): void => {},
    closeFile: (_mod: DuckDBModule, _fileId: number): void => {},
    getLastFileModificationTime: (_mod: DuckDBModule, _fileId: number): number => {
        return 0;
    },
    getFileSize: (_mod: DuckDBModule, _fileId: number): number => {
        return 0;
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
};
