/**
 * js_buffer:// files: bytes held by the runtime, outside the WASM heap.
 *
 * The WASM heap is the scarce resource of DuckDB in the browser, not the disk. DuckDB's temporary directory
 * (spilling) therefore points here by default (js_buffer://tmp): blocks that do not fit the memory limit move to
 * JavaScript memory and come back when needed, with no file system involved and the same behaviour on every
 * platform.
 *
 * The file offers the subset of FileSystemSyncAccessHandle the runtime uses, so the file operations of the
 * runtime treat it like an OPFS access handle.
 */

export const JS_BUFFER_PREFIX = 'js_buffer://';

/** DuckDB joins paths through its Path class, which renders a scheme without authority as "js_buffer:///x" */
function normalize(path: string): string {
    let rest = path.slice(JS_BUFFER_PREFIX.length);
    while (rest.startsWith('/')) rest = rest.slice(1);
    return JS_BUFFER_PREFIX + rest;
}

/** Files are stored in chunks: no single large allocation (a spill file can exceed what one ArrayBuffer may
 * hold), and growth never copies */
const CHUNK_SIZE = 32 * 1024 * 1024;

export class JsBufferFile {
    private chunks: Uint8Array[] = [];
    private size = 0;

    getSize(): number {
        return this.size;
    }

    read(out: Uint8Array, options: { at: number }): number {
        const at = options.at;
        if (at >= this.size) return 0;
        const n = Math.min(out.byteLength, this.size - at);
        let done = 0;
        while (done < n) {
            const position = at + done;
            const chunk = this.chunks[Math.floor(position / CHUNK_SIZE)];
            const offset = position % CHUNK_SIZE;
            const take = Math.min(n - done, CHUNK_SIZE - offset);
            out.set(chunk.subarray(offset, offset + take), done);
            done += take;
        }
        return n;
    }

    write(input: Uint8Array, options: { at: number }): number {
        const end = options.at + input.byteLength;
        this.reserve(end);
        let done = 0;
        while (done < input.byteLength) {
            const position = options.at + done;
            const chunk = this.chunks[Math.floor(position / CHUNK_SIZE)];
            const offset = position % CHUNK_SIZE;
            const take = Math.min(input.byteLength - done, CHUNK_SIZE - offset);
            chunk.set(input.subarray(done, done + take), offset);
            done += take;
        }
        if (end > this.size) this.size = end;
        return input.byteLength;
    }

    truncate(size: number): void {
        if (size < this.size) {
            // Drop whole chunks past the new end, zero the tail of the last one so a later growth reads as zeros
            const keep = Math.ceil(size / CHUNK_SIZE);
            this.chunks.length = keep;
            if (keep > 0) {
                this.chunks[keep - 1].fill(0, size - (keep - 1) * CHUNK_SIZE);
            }
        } else {
            this.reserve(size);
        }
        this.size = size;
    }

    flush(): void {}

    close(): void {
        this.chunks = [];
        this.size = 0;
    }

    /** Chunks come into existence as the file grows, zero-filled */
    private reserve(capacity: number): void {
        const needed = Math.ceil(capacity / CHUNK_SIZE);
        while (this.chunks.length < needed) {
            this.chunks.push(new Uint8Array(CHUNK_SIZE));
        }
    }
}

/** The js_buffer:// files of a runtime, keyed by path */
export class JsBufferFileSystem {
    private files = new Map<string, JsBufferFile>();

    static isPath(path: string): boolean {
        return path.startsWith(JS_BUFFER_PREFIX);
    }

    get(path: string): JsBufferFile | undefined {
        return this.files.get(normalize(path));
    }

    /** Open a file, created if asked for */
    open(path: string, create: boolean): JsBufferFile | null {
        path = normalize(path);
        let file = this.files.get(path);
        if (!file && create) {
            file = new JsBufferFile();
            this.files.set(path, file);
        }
        return file ?? null;
    }

    exists(path: string): boolean {
        return this.files.has(normalize(path));
    }

    remove(path: string): void {
        path = normalize(path);
        this.files.get(path)?.close();
        this.files.delete(path);
    }

    move(from: string, to: string): void {
        from = normalize(from);
        to = normalize(to);
        const file = this.files.get(from);
        if (!file) {
            throw new Error(`Cannot move ${from}: the file does not exist`);
        }
        this.files.get(to)?.close();
        this.files.delete(from);
        this.files.set(to, file);
    }

    /** Any path with the scheme is a directory that exists, there is no hierarchy to maintain */
    directoryExists(path: string): boolean {
        return JsBufferFileSystem.isPath(path);
    }

    /** The files directly below a directory */
    list(directory: string): string[] {
        directory = normalize(directory);
        const prefix = directory.endsWith('/') ? directory : directory + '/';
        const names: string[] = [];
        for (const path of this.files.keys()) {
            if (path.startsWith(prefix) && !path.slice(prefix.length).includes('/')) {
                names.push(path.slice(prefix.length));
            }
        }
        return names;
    }

    /** Remove a directory with everything in it */
    removeDirectory(directory: string): void {
        directory = normalize(directory);
        const prefix = directory.endsWith('/') ? directory : directory + '/';
        for (const path of [...this.files.keys()]) {
            if (path.startsWith(prefix)) this.remove(path);
        }
    }

    /** All paths, for globbing */
    paths(): string[] {
        return [...this.files.keys()];
    }
}
