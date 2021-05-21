import fs from 'fs';
import { DuckDBRuntime } from './runtime_base';
import globToRegexp from 'glob-to-regexp';
import p from 'path';
import crypto from 'crypto';
import { tmpdir } from 'os';

const decoder = new TextDecoder();
const encoder = new TextEncoder();

interface NodeRuntimeFile {
    fileID: number;
    path: string;
    buffer: Uint8Array | null;
    fd: number | null;
    size: number;
    lastModified: number;
}

function tmpFile() {
    return p.join(tmpdir(), `duckdb.tmp.${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}`);
}

// Always open with WRITE for now.
// Buffer manager will have to do that anyway.
const openFile = (path: string) => {
    const fd = fs.openSync(path, 'w');
    const stat = fs.fstatSync(fd);
    const fileID = NodeRuntime.nextFileID++;
    const newFile: NodeRuntimeFile = {
        fileID,
        path,
        buffer: null,
        fd,
        size: stat.size,
        lastModified: stat.mtime.getTime(),
    };
    NodeRuntime.filesByURL.set(path, newFile);
    NodeRuntime.filesByID.set(fileID, newFile);
    return fileID;
};

export const NodeRuntime: DuckDBRuntime & {
    filesByURL: Map<string, NodeRuntimeFile>;
    filesByID: Map<number, NodeRuntimeFile>;
    nextFileID: number;
} = {
    filesByURL: new Map<string, NodeRuntimeFile>(),
    filesByID: new Map<number, NodeRuntimeFile>(),
    nextFileID: 0,
    bindings: null,

    duckdb_web_drop_file(url: string): void {
        const file = NodeRuntime.filesByURL.get(url);
        if (!file) return;
        NodeRuntime.filesByID.delete(file.fileID);
        NodeRuntime.filesByURL.delete(url);
    },
    duckdb_web_drop_files(): void {
        NodeRuntime.filesByID.clear();
        NodeRuntime.filesByURL.clear();
    },
    duckdb_web_add_file_blob: (_url: string, _blob: any) => {
        throw Error('cannot register a file blob');
    },
    duckdb_web_add_file_buffer: (url: string, array: Uint8Array) => {
        const file = NodeRuntime.filesByURL.get(url);
        if (file) return file.fileID;
        const fileID = NodeRuntime.nextFileID++;
        const newFile: NodeRuntimeFile = {
            fileID,
            path: url,
            fd: null,
            buffer: array,
            size: array.length,
            lastModified: new Date().getTime(),
        };
        NodeRuntime.filesByURL.set(url, newFile);
        NodeRuntime.filesByID.set(fileID, newFile);
        return fileID;
    },
    duckdb_web_add_file_path: (url: string, path: string) => {
        const file = NodeRuntime.filesByURL.get(url);
        if (file) return file.fileID;
        return openFile(path);
    },
    duckdb_web_get_file_path: (fileId: number): string | null => {
        const file = NodeRuntime.filesByID.get(fileId);
        return file ? file.path : null;
    },
    duckdb_web_get_file_object_url: (fileId: number): string | null => {
        const file = NodeRuntime.filesByID.get(fileId);
        if (!file) return null;
        if (file.buffer) {
            const tmp = tmpFile();
            fs.writeFileSync(tmp, Buffer.from(file.buffer));
            return tmp;
        }
        return p.resolve(file.path);
    },
    duckdb_web_get_file_buffer: (fileId: number): Uint8Array | null => {
        const file = NodeRuntime.filesByID.get(fileId);
        if (!file) return null;
        if (file.buffer) return file.buffer;
        return fs.readFileSync(file.fd!);
    },
    duckdb_web_fs_read: (fileId: number, buf: number, bytes: number, location: number) => {
        const file = NodeRuntime.filesByID.get(fileId);
        if (!file) return 0;
        const inst = NodeRuntime.bindings!.instance!;
        const heap: Uint8Array = inst.HEAPU8;
        if (file.buffer) {
            const src = file.buffer.subarray(location, location + bytes);
            heap.set(src, buf);
            return src.byteLength;
        }

        return fs.readSync(file.fd!, heap, buf, bytes, location);
    },
    duckdb_web_fs_write: (fileId: number, buf: number, bytes: number, location: number) => {
        const file = NodeRuntime.filesByID.get(fileId);
        if (!file) return 0;
        const inst = NodeRuntime.bindings!.instance!;
        const heap = inst.HEAPU8;
        const src = heap.subarray(buf, buf + bytes);
        if (file.buffer) {
            const dst = file.buffer.subarray(location, location + bytes);
            dst.set(src);
            return bytes;
        }
        return fs.writeSync(file.fd!, src, 0, src.length, location);
    },
    duckdb_web_fs_directory_exists: (pathPtr: number, pathLen: number) => {
        const inst = NodeRuntime.bindings!.instance!;
        const path = decoder.decode(inst.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        return NodeRuntime.filesByURL.has(path) && fs.existsSync(path);
    },
    duckdb_web_fs_directory_create: (pathPtr: number, pathLen: number) => {
        const inst = NodeRuntime.bindings!.instance!;
        const path = decoder.decode(inst.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        return fs.mkdirSync(path);
    },
    duckdb_web_fs_directory_remove: (pathPtr: number, pathLen: number) => {
        const inst = NodeRuntime.bindings!.instance!;
        const path = decoder.decode(inst.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        return fs.rmdirSync(path);
    },
    duckdb_web_fs_directory_list_files: (_pathPtr: number, _pathLen: number) => {
        throw Error('cannot list files');
    },
    duckdb_web_fs_glob: (pathPtr: number, pathLen: number) => {
        const inst = NodeRuntime.bindings!.instance!;
        const glob = decoder.decode(inst.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        const re = globToRegexp(glob);
        for (const path of NodeRuntime.filesByURL.keys()) {
            if (re.test(path)) {
                const data = encoder.encode(path);
                const ptr = inst.stackAlloc(data.length);
                inst.HEAPU8.set(data, ptr);
                NodeRuntime.bindings!.instance!.ccall(
                    'duckdb_web_fs_glob_callback',
                    null,
                    ['number', 'number'],
                    [ptr, data.length],
                );
            }
        }
    },
    duckdb_web_fs_file_open: (pathPtr: number, pathLen: number, _flags: number) => {
        const inst = NodeRuntime.bindings!.instance!;
        const path = decoder.decode(inst.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        const file = NodeRuntime.filesByURL.get(path);
        if (file) return file.fileID;
        return openFile(path);
    },
    duckdb_web_fs_file_close: (fileId: number) => {
        const file = NodeRuntime.filesByID.get(fileId);
        if (!file) return;
        NodeRuntime.filesByID.delete(fileId);
        NodeRuntime.filesByURL.delete(file.path);
    },
    duckdb_web_fs_file_get_size: (fileId: number): number => {
        const file = NodeRuntime.filesByID.get(fileId);
        if (!file) return 0;
        return file.size;
    },
    duckdb_web_fs_file_truncate: (fileId: number, newSize: number) => {
        const file = NodeRuntime.filesByID.get(fileId);
        if (!file) return 0;
        if (file.buffer) {
            const newBuffer = new Uint8Array(newSize);
            newBuffer.set(file.buffer.subarray(0, Math.min(file.buffer.length, newSize)));
            file.buffer = newBuffer;
            file.size = newSize;
            return;
        }
        fs.truncateSync(file.path, newSize);
    },
    duckdb_web_fs_file_get_last_modified_time: (fileId: number) => {
        const file = NodeRuntime.filesByID.get(fileId);
        if (!file) return 0;
        return file.lastModified;
    },
    duckdb_web_fs_file_move: (fromPtr: number, fromLen: number, toPtr: number, toLen: number) => {
        const inst = NodeRuntime.bindings!.instance!;
        const fromPath = decoder.decode(inst.HEAPU8.subarray(fromPtr, fromPtr + fromLen));
        const toPath = decoder.decode(inst.HEAPU8.subarray(toPtr, toPtr + toLen));
        const file = NodeRuntime.filesByURL.get(fromPath);
        if (file && file.buffer) return;
        return fs.renameSync(fromPath, toPath);
    },
    duckdb_web_fs_file_exists: (pathPtr: number, pathLen: number) => {
        const inst = NodeRuntime.bindings!.instance!;
        const path = decoder.decode(inst.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        return NodeRuntime.filesByURL.has(path) && fs.existsSync(path);
    },
    duckdb_web_fs_file_remove: (pathPtr: number, pathLen: number) => {
        const inst = NodeRuntime.bindings!.instance!;
        const path = decoder.decode(inst.HEAPU8.subarray(pathPtr, pathPtr + pathLen));
        const file = NodeRuntime.filesByURL.get(path);
        if (file && file.buffer) return;
        return fs.rmSync(path);
    },
};

export default NodeRuntime;
