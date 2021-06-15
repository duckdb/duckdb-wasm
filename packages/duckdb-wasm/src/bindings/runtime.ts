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
    BLOB = 2,
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
    // File APIs with dedicated file identifier
    duckdb_web_fs_file_open(mod: DuckDBModule, fileId: number): void;
    duckdb_web_fs_file_sync(mod: DuckDBModule, fileId: number): void;
    duckdb_web_fs_file_close(mod: DuckDBModule, fileId: number): void;
    duckdb_web_fs_file_get_last_modified_time(mod: DuckDBModule, fileId: number): number;
    duckdb_web_fs_file_get_size(mod: DuckDBModule, fileId: number): number;
    duckdb_web_fs_file_truncate(mod: DuckDBModule, fileId: number, newSize: number): void;
    duckdb_web_fs_file_read(mod: DuckDBModule, fileId: number, buffer: number, bytes: number, location: number): number;
    duckdb_web_fs_file_write(
        mod: DuckDBModule,
        fileId: number,
        buffer: number,
        bytes: number,
        location: number,
    ): number;

    // File APIs with path parameter
    duckdb_web_fs_directory_remove(mod: DuckDBModule, pathPtr: number, pathLen: number): void;
    duckdb_web_fs_directory_exists(mod: DuckDBModule, pathPtr: number, pathLen: number): boolean;
    duckdb_web_fs_directory_create(mod: DuckDBModule, pathPtr: number, pathLen: number): void;
    duckdb_web_fs_directory_list_files(mod: DuckDBModule, pathPtr: number, pathLen: number): boolean;
    duckdb_web_fs_glob(mod: DuckDBModule, pathPtr: number, pathLen: number): void;
    duckdb_web_fs_file_move(mod: DuckDBModule, fromPtr: number, fromLen: number, toPtr: number, toLen: number): void;
    duckdb_web_fs_file_exists(mod: DuckDBModule, pathPtr: number, pathLen: number): boolean;
    duckdb_web_fs_file_remove(mod: DuckDBModule, pathPtr: number, pathLen: number): void;
}

export const DEFAULT_RUNTIME: DuckDBRuntime = {
    duckdb_web_fs_file_open: (_mod: DuckDBModule, _fileId: number): void => {},
    duckdb_web_fs_file_sync: (_mod: DuckDBModule, _fileId: number): void => {},
    duckdb_web_fs_file_close: (_mod: DuckDBModule, _fileId: number): void => {},
    duckdb_web_fs_file_get_last_modified_time: (_mod: DuckDBModule, _fileId: number): number => {
        return 0;
    },
    duckdb_web_fs_file_get_size: (_mod: DuckDBModule, _fileId: number): number => {
        return 0;
    },
    duckdb_web_fs_file_truncate: (_mod: DuckDBModule, _fileId: number, _newSize: number): void => {},
    duckdb_web_fs_file_read: (
        _mod: DuckDBModule,
        _fileId: number,
        _buffer: number,
        _bytes: number,
        _location: number,
    ): number => {
        return 0;
    },
    duckdb_web_fs_file_write: (
        _mod: DuckDBModule,
        _fileId: number,
        _buffer: number,
        _bytes: number,
        _location: number,
    ): number => {
        return 0;
    },

    duckdb_web_fs_directory_remove: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number): void => {},
    duckdb_web_fs_directory_exists: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number): boolean => {
        return false;
    },
    duckdb_web_fs_directory_create: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number): void => {},
    duckdb_web_fs_directory_list_files: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number): boolean => {
        return false;
    },
    duckdb_web_fs_glob: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number): void => {},
    duckdb_web_fs_file_move: (
        _mod: DuckDBModule,
        _fromPtr: number,
        _fromLen: number,
        _toPtr: number,
        _toLen: number,
    ): void => {},
    duckdb_web_fs_file_exists: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number): boolean => {
        return false;
    },
    duckdb_web_fs_file_remove: (_mod: DuckDBModule, _pathPtr: number, _pathLen: number): void => {},
};
