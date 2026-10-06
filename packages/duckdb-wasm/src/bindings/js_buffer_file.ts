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

export class JsBufferFile {
    private data: Uint8Array = new Uint8Array(0);
    private size = 0;

    getSize(): number {
        return this.size;
    }

    read(out: Uint8Array, options: { at: number }): number {
        const at = options.at;
        if (at >= this.size) return 0;
        const n = Math.min(out.byteLength, this.size - at);
        out.set(this.data.subarray(at, at + n));
        return n;
    }

    write(input: Uint8Array, options: { at: number }): number {
        const end = options.at + input.byteLength;
        this.reserve(end);
        this.data.set(input, options.at);
        if (end > this.size) this.size = end;
        return input.byteLength;
    }

    truncate(size: number): void {
        if (size < this.size) {
            // Zero the tail so a later growth reads as zeros
            this.data.fill(0, size, this.size);
        } else {
            this.reserve(size);
        }
        this.size = size;
    }

    flush(): void {}

    close(): void {
        this.data = new Uint8Array(0);
        this.size = 0;
    }

    /** Grow the backing buffer geometrically, writes come in blocks */
    private reserve(capacity: number): void {
        if (capacity <= this.data.byteLength) return;
        let next = Math.max(this.data.byteLength * 2, 1 << 20);
        while (next < capacity) next *= 2;
        const grown = new Uint8Array(next);
        grown.set(this.data.subarray(0, this.size));
        this.data = grown;
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
