import { DuckDBRuntime } from './runtime_base';
import globToRegexp from 'glob-to-regexp';

const decoder = new TextDecoder();
const encoder = new TextEncoder();

interface BrowserRuntimeFile {
    fileID: number;
    url: string;
    buffer: Uint8Array | null;
    blob: Blob | null;
    lastModified: Date;
    size: number;
}

// TODO make this independant of the environment:
// Functions should have access to the heap through HeapU8
// https://stackoverflow.com/questions/60106899/creating-an-array-at-a-known-heap-address-in-emscripten

export const BrowserRuntime: DuckDBRuntime & {
    filesByURL: Map<string, BrowserRuntimeFile>;
    filesByID: Map<number, BrowserRuntimeFile>;
    nextFileID: number;
} = {
    filesByURL: new Map<string, BrowserRuntimeFile>(),
    filesByID: new Map<number, BrowserRuntimeFile>(),
    nextFileID: 0,
    bindings: null,

    duckdb_web_drop_file(url: string): void {
        const file = BrowserRuntime.filesByURL.get(url);
        if (!file) return;
        BrowserRuntime.filesByID.delete(file.fileID);
        BrowserRuntime.filesByURL.delete(url);
    },
    duckdb_web_drop_files(): void {
        BrowserRuntime.filesByID.clear();
        BrowserRuntime.filesByURL.clear();
    },
    duckdb_web_get_file_path: (fileId: number): string | null => {
        const file = BrowserRuntime.filesByID.get(fileId);
        return file ? file.url : null;
    },
    duckdb_web_add_file_path: (path: string) => {
        const file = BrowserRuntime.filesByURL.get(path);
        if (file) return file.fileID;

        // Check if remote supports range requests
        const headerRequest = new XMLHttpRequest();
        headerRequest.open('HEAD', path, false);
        headerRequest.send(null);
        const rangeHeader = headerRequest.getResponseHeader('Accept-Ranges');
        const sizeHeader = headerRequest.getResponseHeader('Content-Length');

        const fileID = BrowserRuntime.nextFileID++;
        if (!rangeHeader || rangeHeader === 'none' || !sizeHeader) {
            // No support or content length header missing, fetch full contents now
            const request = new XMLHttpRequest();
            request.open('GET', path, false);
            request.responseType = 'arraybuffer';
            request.send(null);
            const buffer = new Uint8Array(request.response);

            const newFile: BrowserRuntimeFile = {
                fileID,
                url: path,
                buffer,
                blob: null,
                lastModified: new Date(),
                size: buffer.length,
            };
            BrowserRuntime.filesByURL.set(path, newFile);
            BrowserRuntime.filesByID.set(fileID, newFile);
        } else {
            const size = parseInt(sizeHeader);
            const newFile: BrowserRuntimeFile = {
                fileID,
                url: path,
                buffer: null,
                blob: null,
                lastModified: new Date(),
                size,
            };
            BrowserRuntime.filesByURL.set(path, newFile);
            BrowserRuntime.filesByID.set(fileID, newFile);
        }
        return fileID;
    },
    duckdb_web_add_file_blob: (url: string, blob: any) => {
        const file = BrowserRuntime.filesByURL.get(url);
        if (file) return file.fileID;
        const fileID = BrowserRuntime.nextFileID++;
        const newFile: BrowserRuntimeFile = {
            fileID,
            url,
            buffer: null,
            blob,
            lastModified: new Date(),
            size: blob.size,
        };
        BrowserRuntime.filesByURL.set(url, newFile);
        BrowserRuntime.filesByID.set(fileID, newFile);
        return fileID;
    },
    duckdb_web_add_file_buffer: (url: string, buffer: Uint8Array) => {
        const file = BrowserRuntime.filesByURL.get(url);
        if (file) return file.fileID;
        const fileID = BrowserRuntime.nextFileID++;
        const newFile: BrowserRuntimeFile = {
            fileID,
            url,
            buffer,
            blob: null,
            lastModified: new Date(),
            size: buffer.length,
        };
        BrowserRuntime.filesByURL.set(url, newFile);
        BrowserRuntime.filesByID.set(fileID, newFile);
        return fileID;
    },
    duckdb_web_get_file_object_url: (fileId: number): string | null => {
        const file = BrowserRuntime.filesByID.get(fileId);
        if (!file) return null;
        if (file.buffer) {
            return URL.createObjectURL(new Blob([file.buffer]));
        } else {
            return URL.createObjectURL(file.blob);
        }
    },
    duckdb_web_get_file_buffer: (fileId: number): Uint8Array | null => {
        const file = BrowserRuntime.filesByID.get(fileId);
        if (!file) return null;
        if (file.buffer) return file.buffer;
        return new Uint8Array(new FileReaderSync().readAsArrayBuffer(file.blob!));
    },
    duckdb_web_fs_read: (fileId: number, buf: number, bytes: number, location: number) => {
        const file = BrowserRuntime.filesByID.get(fileId);
        if (!file) return 0;
        const inst = BrowserRuntime.bindings!.instance!;
        // We copy the blob only if the file was written to
        if (file.buffer) {
            const src = file.buffer.subarray(location, location + bytes);
            inst.HEAPU8.set(src, buf);
            return src.byteLength;
        } else if (file.blob) {
            const blob = file.blob!.slice(location, location + bytes);
            const src = new Uint8Array(new FileReaderSync().readAsArrayBuffer(blob));
            inst.HEAPU8.set(src, buf);
            return src.byteLength;
        } else {
            const request = new XMLHttpRequest();
            request.open('GET', file.url, false);
            request.responseType = 'arraybuffer';
            request.setRequestHeader('Range', `bytes=${location}-${location + bytes - 1}`);
            request.send(null);
            if (request.status == 206 /* Partial content */) {
                const src = new Uint8Array(request.response);
                inst.HEAPU8.set(src, buf);
                return src.byteLength;
            } else {
                throw Error(
                    `Range request for ${file.url} returned non-success status: ${request.status} "${request.statusText}"`,
                );
            }
        }
    },
    duckdb_web_fs_write: (fileId: number, buf: number, bytes: number, location: number) => {
        const file = BrowserRuntime.filesByID.get(fileId);
        if (!file) return 0;
        const inst = BrowserRuntime.bindings!.instance!;
        const src = inst.HEAPU8.subarray(buf, buf + bytes);
        // Copy entire blob on first write
        if (!file.buffer) {
            file.buffer = new Uint8Array(new FileReaderSync().readAsArrayBuffer(file.blob!));
            file.size = file.buffer.length;
            file.blob = null;
        }
        const dst = file.buffer.subarray(location, location + bytes);
        dst.set(src);
        return bytes;
    },
    duckdb_web_fs_directory_exists: (_pathPtr: number, _pathLen: number) => false,
    duckdb_web_fs_directory_create: (_pathPtr: number, _pathLen: number) => {},
    duckdb_web_fs_directory_remove: (_pathPtr: number, _pathLen: number) => {},
    duckdb_web_fs_directory_list_files: (_pathPtr: number, _pathLen: number) => false,
    duckdb_web_fs_glob: (pathPtr: number, pathLen: number) => {
        const inst = BrowserRuntime.bindings!.instance!;
        const path = decoder.decode(inst.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        const re = globToRegexp(path);
        for (const url of BrowserRuntime.filesByURL.keys()) {
            if (re.test(url)) {
                const data = encoder.encode(url);
                const ptr = inst.stackAlloc(data.length);
                inst.HEAPU8.set(data, ptr);
                BrowserRuntime.bindings!.instance!.ccall(
                    'duckdb_web_fs_glob_callback',
                    null,
                    ['number', 'number'],
                    [ptr, data.length],
                );
            }
        }
    },
    duckdb_web_fs_file_open: (pathPtr: number, pathLen: number, _flags: number) => {
        const inst = BrowserRuntime.bindings!.instance!;
        const path = decoder.decode(inst.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        const file = BrowserRuntime.filesByURL.get(path);
        if (file) return file.fileID;
        throw Error(`File not found: ${path}`);
    },
    duckdb_web_fs_file_close: (_fileId: number) => {
        // Noop
    },
    duckdb_web_fs_file_get_size: (fileId: number) => {
        const file = BrowserRuntime.filesByID.get(fileId);
        if (!file) return 0;
        return file.size;
    },
    duckdb_web_fs_file_truncate: (fileId: number, newSize: number) => {
        const file = BrowserRuntime.filesByID.get(fileId);
        if (!file) return 0;
        let buffer = file.buffer;
        if (!buffer) {
            buffer = new Uint8Array(new FileReaderSync().readAsArrayBuffer(file.blob!));
        }
        const newBuffer = new Uint8Array(newSize);
        newBuffer.set(buffer.subarray(0, Math.min(buffer.length, newSize)));
        file.buffer = newBuffer;
        file.size = newSize;
        file.blob = null;
    },
    duckdb_web_fs_file_get_last_modified_time: (fileId: number) => {
        const file = BrowserRuntime.filesByID.get(fileId);
        if (!file) return 0;
        return file.lastModified.getTime();
    },
    duckdb_web_fs_file_move: (fromPtr: number, fromLen: number, toPtr: number, toLen: number) => {
        const inst = BrowserRuntime.bindings!.instance!;
        const fromPath = decoder.decode(inst.HEAPU8.subarray(fromPtr, fromPtr + fromLen));
        const toPath = decoder.decode(inst.HEAPU8.subarray(toPtr, toPtr + toLen));
        const file = BrowserRuntime.filesByURL.get(fromPath);
        if (!file) return;
        file.url = toPath;
        BrowserRuntime.filesByURL.delete(fromPath);
        BrowserRuntime.filesByURL.set(toPath, file);
    },
    duckdb_web_fs_file_exists: (pathPtr: number, pathLen: number) => {
        const inst = BrowserRuntime.bindings!.instance!;
        const path = decoder.decode(inst.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        const file = BrowserRuntime.filesByURL.get(path);
        return !!file;
    },
    duckdb_web_fs_file_remove: (pathPtr: number, pathLen: number) => {
        const inst = BrowserRuntime.bindings!.instance!;
        const path = decoder.decode(inst.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        BrowserRuntime.filesByURL.delete(path);
    },
};
export default BrowserRuntime;
