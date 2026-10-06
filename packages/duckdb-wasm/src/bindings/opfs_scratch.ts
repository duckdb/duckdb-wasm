/**
 * OPFS scratch: synchronous creation of `opfs://` files.
 *
 * OPFS sync access handles can only be acquired asynchronously, but DuckDB opens files from synchronous code in the
 * middle of a query. Real files (`opfs://<path>` at `/duckdb/fs/<path>`) therefore have their handles prepared ahead
 * of a query, and only the files a query names are open: an access handle is exclusive (a `read-only` one still
 * excludes writers), so a file held open here is unavailable to other tabs. Reads take `read-only` handles, which
 * other tabs can share, databases take `readwrite` ones. Files DuckDB names at runtime (temporary files of a COPY, write-ahead logs, spill files, ...) cannot be
 * prepared: they are served from a pool of pre-opened files in `/duckdb/scratch/<uuid>/`, and a manifest records
 * which virtual path each pool file stands for. Renames and removals are manifest edits. Between queries a
 * checkpoint moves the mapped pool files to their real paths, so the directory converges to real names and the
 * manifest to empty. Each DuckDB instance (tab) has its own scratch directory, the exclusive sync handle on its
 * manifest tells whether the owner is still alive; scratch directories of dead owners are reconciled at startup.
 *
 * Layout of the OPFS root (other programs may use the root, nothing outside `/duckdb/` is touched):
 *   /duckdb/fs/<path>                 <-> opfs://<path>
 *   /duckdb/scratch/<uuid>/manifest   one JSON line per mapping {"v": virtual path, "p": pool file}
 *   /duckdb/scratch/<uuid>/pool-<k>   pre-opened files, mapped ones are in flight to /duckdb/fs, the rest are free
 * Files that exist at the root (the layout before /duckdb/fs) are read in place.
 *
 * Directories: the tree below /duckdb/fs is walked at mount (names only, nothing is opened), so existence, listing
 * and globbing are answered synchronously. Creating and removing directories are recorded and applied at the
 * checkpoint, like the moves of files. The walk is repeated before a glob is expanded, other tabs may have added
 * files.
 */

export const OPFS_PREFIX = 'opfs://';
/** DuckDB's home directory: small files below it are cached at mount, DuckDB opens them (persistent secrets)
 * without naming them in SQL, so they cannot be prepared ahead of a query */
export const OPFS_HOME = 'opfs://home';
const CACHED_FILE_LIMIT = 1 << 20;
const ROOT_DIR = 'duckdb';
const FS_DIR = 'fs';
const SCRATCH_DIR = 'scratch';
const MANIFEST_NAME = 'manifest';
const POOL_PREFIX = 'pool-';
const PATH_SEP_REGEX = /\/|\\/;

/** FileSystemFileHandle.move() is not in the TypeScript DOM library yet */
interface MovableFileHandle extends FileSystemFileHandle {
    move(directory: FileSystemDirectoryHandle, name: string): Promise<void>;
}

/** A pool file: created and opened ahead of time. A real file that was renamed also travels as one, with its
 * origin, until the checkpoint moves it */
interface PoolFile {
    name: string;
    fileHandle: FileSystemFileHandle;
    handle: FileSystemSyncAccessHandle;
    origin?: { directory: FileSystemDirectoryHandle; name: string };
    /** A copy of a cached file: discarded at the checkpoint unless it was written to */
    copy?: boolean;
}

/** A real file: its directory and name under /duckdb/fs, or at the root for the legacy layout */
interface RealFile {
    directory: FileSystemDirectoryHandle;
    name: string;
    fileHandle: FileSystemFileHandle;
    handle: FileSystemSyncAccessHandle;
    /** A read-only handle can be shared with other tabs */
    readOnly: boolean;
}

export type OPFSAccessMode = 'read' | 'write';

/** Open a sync access handle, read-only where the browser supports the mode (Chrome 121+) */
async function createAccessHandle(
    fileHandle: FileSystemFileHandle,
    mode: OPFSAccessMode,
): Promise<{ handle: FileSystemSyncAccessHandle; readOnly: boolean }> {
    if (mode === 'read') {
        try {
            const handle = await (fileHandle as any).createSyncAccessHandle({ mode: 'read-only' });
            return { handle, readOnly: true };
        } catch (e: any) {
            // The mode option is unknown to this browser: an exclusive handle
            if (e?.name !== 'TypeError') throw e;
        }
    }
    return { handle: await fileHandle.createSyncAccessHandle(), readOnly: false };
}

export interface OPFSScratchOptions {
    /** The number of pre-opened pool files, the number of files a single query can create */
    poolSize: number;
    /** Receives a debug line per scratch operation */
    debug?: (event: string, ...args: any[]) => void;
}

export class OPFSScratch {
    /** The OPFS root */
    private root: FileSystemDirectoryHandle;
    /** /duckdb/fs */
    private fsDir: FileSystemDirectoryHandle;
    /** /duckdb/scratch/<uuid> */
    private scratchDir: FileSystemDirectoryHandle;
    /** The manifest, its exclusive handle also tells other instances that this one is alive */
    private manifest: FileSystemSyncAccessHandle;
    private manifestSize = 0;
    /** Free pool files */
    private pool: PoolFile[] = [];
    private poolCounter = 0;
    private readonly poolSize: number;
    /** Virtual paths served from a pool file */
    private mapped = new Map<string, PoolFile>();
    /** Virtual paths served from a real file, open */
    private real = new Map<string, RealFile>();
    /** Files below /duckdb/fs, known from the walk; open or not */
    private tree = new Set<string>();
    /** The content of small files below the home directory, served copy-on-open */
    private cached = new Map<string, Uint8Array>();
    /** Virtual paths written to since the last checkpoint */
    private written = new Set<string>();
    /** Real files removed or replaced, deleted at the next checkpoint */
    private pendingDelete = new Map<string, RealFile>();
    /** Files removed that were not open, deleted by path at the next checkpoint */
    private pendingDeletePaths = new Set<string>();
    /** Directories below /duckdb/fs, as virtual paths without trailing separator (the root is implicit) */
    private directories = new Set<string>();
    /** Directories created and removed since the last checkpoint, applied in that order after the file deletes */
    private pendingCreateDirs = new Set<string>();
    private pendingRemoveDirs = new Set<string>();

    private constructor(
        root: FileSystemDirectoryHandle,
        fsDir: FileSystemDirectoryHandle,
        scratchDir: FileSystemDirectoryHandle,
        manifest: FileSystemSyncAccessHandle,
        options: OPFSScratchOptions,
    ) {
        this.root = root;
        this.fsDir = fsDir;
        this.scratchDir = scratchDir;
        this.manifest = manifest;
        this.poolSize = options.poolSize;
        this.debug = options.debug ?? (() => {});
    }
    /** The debug log */
    private readonly debug: (event: string, ...args: any[]) => void;

    /** Mount: create the layout, open the manifest, fill the pool, reconcile scratch of dead instances */
    static async mount(options: OPFSScratchOptions): Promise<OPFSScratch> {
        const root = await navigator.storage.getDirectory();
        const duckdbDir = await root.getDirectoryHandle(ROOT_DIR, { create: true });
        const fsDir = await duckdbDir.getDirectoryHandle(FS_DIR, { create: true });
        const scratchRoot = await duckdbDir.getDirectoryHandle(SCRATCH_DIR, { create: true });
        const uuid = crypto.randomUUID();
        const scratchDir = await scratchRoot.getDirectoryHandle(uuid, { create: true });
        const manifestFile = await scratchDir.getFileHandle(MANIFEST_NAME, { create: true });
        const manifest = await manifestFile.createSyncAccessHandle();
        const scratch = new OPFSScratch(root, fsDir, scratchDir, manifest, options);
        await scratch.sweep(scratchRoot, uuid);
        // Every real file is opened ahead of any query, DuckDB can then open them synchronously by name
        await scratch.scan(fsDir, OPFS_PREFIX);
        await scratch.replenish();
        return scratch;
    }

    /** Open sync access handles for every file below a directory. Files another instance holds open are skipped */
    /** Walk a directory, recording the names of files and directories */
    private async scan(directory: FileSystemDirectoryHandle, prefix: string): Promise<void> {
        for await (const [name, entry] of (directory as any).entries()) {
            const path = prefix + name;
            if (entry.kind === 'directory') {
                this.directories.add(path);
                await this.scan(entry as FileSystemDirectoryHandle, path + '/');
            } else {
                this.tree.add(path);
                if (path.startsWith(OPFS_HOME + '/') && !this.real.has(path) && !this.mapped.has(path)) {
                    const file = await (entry as FileSystemFileHandle).getFile();
                    if (file.size <= CACHED_FILE_LIMIT) {
                        this.cached.set(path, new Uint8Array(await file.arrayBuffer()));
                    }
                }
            }
        }
    }

    /** Walk /duckdb/fs again: files and directories that other tabs added or removed since the mount */
    async rescan(): Promise<void> {
        const files = new Set<string>();
        const directories = new Set<string>();
        const previous = { tree: this.tree, directories: this.directories, cached: this.cached };
        this.tree = files;
        this.directories = directories;
        this.cached = new Map();
        try {
            await this.scan(this.fsDir, OPFS_PREFIX);
        } catch (e: any) {
            this.tree = previous.tree;
            this.directories = previous.directories;
            this.cached = previous.cached;
            throw e;
        }
        // What this instance holds or changed stays as it knows it
        for (const path of this.real.keys()) this.tree.add(path);
        for (const path of this.pendingDelete.keys()) this.tree.delete(path);
        for (const path of this.pendingCreateDirs) this.directories.add(path);
        for (const path of this.pendingRemoveDirs) this.directories.delete(path);
    }

    /** The handles of the sync access registry are keyed by virtual path, this is the view of them */
    get handles(): Map<string, FileSystemSyncAccessHandle> {
        const out = new Map<string, FileSystemSyncAccessHandle>();
        for (const [path, file] of this.real) out.set(path, file.handle);
        for (const [path, file] of this.mapped) out.set(path, file.handle);
        return out;
    }

    /** Get the sync access handle of a virtual path, if it is open */
    getHandle(path: string): FileSystemSyncAccessHandle | undefined {
        return this.mapped.get(path)?.handle ?? this.real.get(path)?.handle;
    }

    /** Does the file exist? */
    exists(path: string): boolean {
        return this.mapped.has(path) || this.real.has(path) || this.tree.has(path);
    }

    /** Is the file open with a read-only handle? */
    isReadOnly(path: string): boolean {
        return this.real.get(path)?.readOnly ?? false;
    }

    /** Is there anything for a checkpoint to do? */
    get dirty(): boolean {
        return (
            this.mapped.size > 0 ||
            this.pendingDelete.size > 0 ||
            this.pendingDeletePaths.size > 0 ||
            this.pendingCreateDirs.size > 0 ||
            this.pendingRemoveDirs.size > 0 ||
            this.pool.length < this.poolSize / 2
        );
    }

    // -------------------------------------------------------------------------------------------------------------
    // Asynchronous: between queries

    /** Prepare a real file ahead of a query: open its access handle. Returns false if the file does not exist, it
     * is then created in the scratch when first opened */
    async prepare(path: string, mode: OPFSAccessMode): Promise<boolean> {
        if (this.mapped.has(path)) return true;
        const open = this.real.get(path);
        if (open) {
            if (mode === 'read' || !open.readOnly) return true;
            // Reopen for writing
            open.handle.close();
            this.real.delete(path);
        }
        if (this.pendingDelete.has(path)) return false;
        let located;
        try {
            located = await this.locate(path, false);
        } catch (e: any) {
            throw new Error(`OPFS prepare of ${path} failed: ${e?.message ?? e}`);
        }
        if (!located) {
            this.tree.delete(path);
            return false;
        }
        const { handle, readOnly } = await createAccessHandle(located.fileHandle, mode);
        this.debug('scratch prepared', path, mode, `size=${handle.getSize()}`);
        this.real.set(path, { ...located, handle, readOnly });
        this.tree.add(path);
        return true;
    }

    /** The files a glob pattern matches, the tree is rescanned first */
    async expand(pattern: string): Promise<string[]> {
        await this.rescan();
        return this.glob(pattern);
    }

    /** Checkpoint: delete removed files, move mapped pool files to their real paths, refill the pool */
    async checkpoint(): Promise<void> {
        try {
            await this.checkpointInternal();
        } catch (e: any) {
            throw new Error(`OPFS scratch checkpoint failed: ${e?.message ?? e} (mapped: ${[...this.mapped.keys()].join(', ')})`);
        }
    }

    private async checkpointInternal(): Promise<void> {
        this.debug('scratch checkpoint', `mapped=${[...this.mapped.keys()].join(',')}`, `delete=${[...this.pendingDelete.keys()].join(',')}`);
        for (const [path, file] of this.pendingDelete) {
            await file.directory.removeEntry(file.name).catch(() => {});
            this.pendingDelete.delete(path);
        }
        for (const path of this.pendingDeletePaths) {
            const located = await this.locate(path, false);
            if (located) {
                await located.directory.removeEntry(located.name).catch(() => {});
            }
            this.pendingDeletePaths.delete(path);
        }
        for (const path of this.pendingRemoveDirs) {
            const located = await this.locate(path, false);
            if (located) {
                await located.directory.removeEntry(located.name, { recursive: true }).catch(() => {});
            }
            this.pendingRemoveDirs.delete(path);
        }
        for (const path of this.pendingCreateDirs) {
            await this.resolveDirectory(path, true);
            this.pendingCreateDirs.delete(path);
        }
        for (const [path, poolFile] of this.mapped) {
            if (poolFile.copy && !this.written.has(path)) {
                // Read through the copy, the real file is untouched
                poolFile.handle.truncate(0);
                poolFile.copy = undefined;
                this.pool.push(poolFile);
                this.mapped.delete(path);
                continue;
            }
            if (poolFile.copy && path.startsWith(OPFS_HOME + '/')) {
                const size = poolFile.handle.getSize();
                if (size <= CACHED_FILE_LIMIT) {
                    const bytes = new Uint8Array(size);
                    poolFile.handle.read(bytes, { at: 0 });
                    this.cached.set(path, bytes);
                } else {
                    this.cached.delete(path);
                }
            }
            const target = await this.locate(path, true);
            if (!target) continue;
            // A real file of that name is replaced
            const existing = this.real.get(path);
            if (existing) {
                existing.handle.close();
                this.real.delete(path);
            }
            await target.directory.removeEntry(target.name).catch(() => {});
            // The pool file is moved into place and reopened, DuckDB keeps using the virtual path
            poolFile.handle.flush();
            poolFile.handle.close();
            await (poolFile.fileHandle as MovableFileHandle).move(target.directory, target.name);
            const fileHandle = await target.directory.getFileHandle(target.name);
            const handle = await fileHandle.createSyncAccessHandle();
            this.real.set(path, { directory: target.directory, name: target.name, fileHandle, handle, readOnly: false });
            this.tree.add(path);
            this.mapped.delete(path);
        }
        this.written.clear();
        this.rewriteManifest();
        await this.replenish();
    }

    /** Close everything, the scratch directory of a cleanly closed instance is removed */
    async close(): Promise<void> {
        await this.checkpoint();
        for (const file of this.real.values()) file.handle.close();
        for (const file of this.pool) file.handle.close();
        this.real.clear();
        this.pool = [];
        this.manifest.close();
        const scratchRoot = await (await this.root.getDirectoryHandle(ROOT_DIR)).getDirectoryHandle(SCRATCH_DIR);
        await scratchRoot.removeEntry(this.scratchDir.name, { recursive: true }).catch(() => {});
    }

    // -------------------------------------------------------------------------------------------------------------
    // Synchronous: during queries

    /** Open a virtual path for DuckDB: the prepared real file, the mapped pool file, or a fresh pool file */
    open(path: string): FileSystemSyncAccessHandle {
        const handle = this.getHandle(path);
        this.debug('scratch open', path, handle ? 'existing' : 'new');
        if (handle) return handle;
        const cached = this.cached.get(path);
        if (this.tree.has(path) && !cached) {
            throw new Error(`Cannot open ${path} during a query: the file exists but was not prepared before it`);
        }
        const poolFile = this.pool.pop();
        if (!poolFile) {
            throw new Error(
                `Cannot create ${path}: the OPFS scratch pool of ${this.poolSize} files is exhausted, ` +
                    `a single query created more files than that`,
            );
        }
        this.pendingDelete.delete(path);
        if (cached) {
            // The copy stands in for the real file, the checkpoint keeps it only if it was written to
            poolFile.handle.write(cached, { at: 0 });
            poolFile.copy = true;
        }
        this.mapped.set(path, poolFile);
        this.appendManifest(path, poolFile.name);
        return poolFile.handle;
    }

    /** Note a write, the checkpoint moves written copies into place */
    markWritten(path: string): void {
        if (this.mapped.get(path)?.copy) this.written.add(path);
    }

    /** Release a real file's handle without removing the file (DuckDB dropped it from its registry) */
    release(path: string): void {
        this.debug('scratch release', path);
        const file = this.real.get(path);
        if (file) {
            // A read-only handle cannot flush, it has nothing to flush
            if (!file.readOnly) file.handle.flush();
            file.handle.close();
            this.real.delete(path);
        }
        // mapped files stay until the checkpoint has moved them into place
    }

    /** Move a file: a manifest edit, the content is never copied */
    move(from: string, to: string): void {
        if (from === to) return;
        this.debug('scratch move', from, to);
        const source = this.mapped.get(from);
        const realSource = this.real.get(from);
        if (!source && !realSource) {
            throw new Error(`Cannot move ${from}: the file is not open`);
        }
        // Whatever was at the target is removed
        this.removeInternal(to);
        this.tree.delete(from);
        this.cached.delete(from);
        if (source) {
            this.mapped.delete(from);
            this.mapped.set(to, source);
            if (this.written.delete(from)) this.written.add(to);
        } else {
            // A real file moves through the scratch: it keeps its handle and is moved into place at the checkpoint
            this.real.delete(from);
            const poolFile: PoolFile = {
                name: `${POOL_PREFIX}real-${this.poolCounter++}`,
                fileHandle: realSource!.fileHandle,
                handle: realSource!.handle,
                origin: { directory: realSource!.directory, name: realSource!.name },
            };
            this.mapped.set(to, poolFile);
        }
        this.rewriteManifest();
    }

    /** Remove a file */
    remove(path: string): void {
        this.debug('scratch remove', path);
        this.removeInternal(path);
        this.rewriteManifest();
    }

    // -------------------------------------------------------------------------------------------------------------
    // Directories

    /** Does the directory exist? The root always does, a directory also exists through its files */
    directoryExists(path: string): boolean {
        path = OPFSScratch.trimDirectory(path);
        if (path === OPFS_PREFIX) return true;
        if (this.directories.has(path)) return true;
        const prefix = path + '/';
        for (const file of this.files()) {
            if (file.startsWith(prefix)) return true;
        }
        return false;
    }

    /** Create a directory, with its parents */
    createDirectory(path: string): void {
        path = OPFSScratch.trimDirectory(path);
        this.debug('scratch mkdir', path);
        if (path === OPFS_PREFIX || this.directories.has(path)) return;
        for (const parent of OPFSScratch.parents(path)) {
            if (!this.directories.has(parent)) {
                this.directories.add(parent);
                this.pendingRemoveDirs.delete(parent);
                this.pendingCreateDirs.add(parent);
            }
        }
    }

    /** Remove a directory with everything below it */
    removeDirectory(path: string): void {
        path = OPFSScratch.trimDirectory(path);
        this.debug('scratch rmdir', path);
        if (path === OPFS_PREFIX) {
            throw new Error('Cannot remove the OPFS root');
        }
        const prefix = path + '/';
        for (const file of this.files()) {
            if (file.startsWith(prefix)) this.removeInternal(file);
        }
        for (const directory of [...this.directories]) {
            if (directory === path || directory.startsWith(prefix)) {
                this.directories.delete(directory);
                this.pendingCreateDirs.delete(directory);
            }
        }
        this.pendingRemoveDirs.add(path);
        this.rewriteManifest();
    }

    /** The entries directly below a directory */
    list(path: string): { name: string; isDirectory: boolean }[] {
        path = OPFSScratch.trimDirectory(path);
        const prefix = path === OPFS_PREFIX ? OPFS_PREFIX : path + '/';
        const entries: { name: string; isDirectory: boolean }[] = [];
        const seen = new Set<string>();
        for (const directory of this.directories) {
            if (!directory.startsWith(prefix)) continue;
            const name = directory.slice(prefix.length);
            if (name.includes('/') || seen.has(name)) continue;
            seen.add(name);
            entries.push({ name, isDirectory: true });
        }
        for (const file of this.files()) {
            if (!file.startsWith(prefix)) continue;
            const name = file.slice(prefix.length);
            if (name.includes('/') || seen.has(name)) continue;
            seen.add(name);
            entries.push({ name, isDirectory: false });
        }
        return entries;
    }

    /** The files matching a glob pattern (* within a name, ** across directories, ? a character) */
    glob(pattern: string): string[] {
        const regex = new RegExp(
            '^' +
                pattern
                    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
                    .replace(/\*\*/g, '\0')
                    .replace(/\*/g, '[^/]*')
                    .replace(/\0/g, '.*')
                    .replace(/\?/g, '[^/]') +
                '$',
        );
        return [...this.files()].filter(path => regex.test(path)).sort();
    }

    /** All files: known on disk and in flight, the pending deletes are gone already */
    private *files(): IterableIterator<string> {
        yield* this.tree;
        for (const path of this.mapped.keys()) {
            if (!this.tree.has(path)) yield path;
        }
    }

    /** A directory path without its trailing separator */
    private static trimDirectory(path: string): string {
        while (path.length > OPFS_PREFIX.length && (path.endsWith('/') || path.endsWith('\\'))) {
            path = path.slice(0, -1);
        }
        return path;
    }

    /** The directory and its parents, outermost first */
    private static parents(path: string): string[] {
        const parts = path.slice(OPFS_PREFIX.length).split(PATH_SEP_REGEX).filter(p => p.length > 0);
        const out: string[] = [];
        for (let i = 1; i <= parts.length; i++) {
            out.push(OPFS_PREFIX + parts.slice(0, i).join('/'));
        }
        return out;
    }

    private removeInternal(path: string): void {
        this.cached.delete(path);
        const poolFile = this.mapped.get(path);
        if (poolFile) {
            this.mapped.delete(path);
            poolFile.handle.truncate(0);
            poolFile.copy = undefined;
            if (poolFile.origin) {
                // Was a real file that moved through the scratch, it is deleted at the checkpoint
                poolFile.handle.close();
                this.pendingDelete.set(`${path}\0${this.poolCounter++}`, {
                    ...poolFile.origin,
                    fileHandle: poolFile.fileHandle,
                    handle: poolFile.handle,
                    readOnly: false,
                });
            } else {
                this.pool.push(poolFile);
            }
        }
        const real = this.real.get(path);
        if (real) {
            real.handle.close();
            this.real.delete(path);
            this.pendingDelete.set(path, real);
        } else if (this.tree.has(path)) {
            // Known but not open: deleted at the checkpoint by path
            this.pendingDeletePaths.add(path);
        }
        this.tree.delete(path);
    }

    // -------------------------------------------------------------------------------------------------------------
    // Internals

    /** Resolve a directory below /duckdb/fs, created on request */
    private async resolveDirectory(path: string, create: boolean): Promise<FileSystemDirectoryHandle | null> {
        const parts = path.slice(OPFS_PREFIX.length).split(PATH_SEP_REGEX).filter(p => p.length > 0);
        let directory = this.fsDir;
        try {
            for (const part of parts) {
                directory = await directory.getDirectoryHandle(part, { create });
            }
        } catch (e: any) {
            if (e?.name !== 'NotFoundError') throw e;
            return null;
        }
        return directory;
    }

    /** Locate a real file: under /duckdb/fs, or at the root for files of the previous layout */
    private async locate(
        path: string,
        create: boolean,
    ): Promise<{ directory: FileSystemDirectoryHandle; name: string; fileHandle: FileSystemFileHandle } | null> {
        const relative = path.startsWith(OPFS_PREFIX) ? path.slice(OPFS_PREFIX.length) : path;
        const parts = relative.split(PATH_SEP_REGEX).filter(p => p.length > 0);
        if (parts.length === 0) return null;
        const name = parts.pop()!;
        const resolve = async (base: FileSystemDirectoryHandle, createDirs: boolean) => {
            let directory = base;
            for (const part of parts) {
                directory = await directory.getDirectoryHandle(part, { create: createDirs });
            }
            return directory;
        };
        // Not found, or a directory of that name (a SQL literal may name one): not a file
        const notAFile = (e: any) => e?.name === 'NotFoundError' || e?.name === 'TypeMismatchError';
        try {
            const directory = await resolve(this.fsDir, create);
            const fileHandle = await directory.getFileHandle(name, { create });
            return { directory, name, fileHandle };
        } catch (e: any) {
            if (!notAFile(e)) throw e;
        }
        if (create) return null;
        // The previous layout kept opfs:// files at the root
        try {
            const directory = await resolve(this.root, false);
            const fileHandle = await directory.getFileHandle(name, { create: false });
            return { directory, name, fileHandle };
        } catch (e: any) {
            if (!notAFile(e)) throw e;
            return null;
        }
    }

    /** Fill the pool */
    private async replenish(): Promise<void> {
        while (this.pool.length < this.poolSize) {
            const name = `${POOL_PREFIX}${this.poolCounter++}`;
            const fileHandle = await this.scratchDir.getFileHandle(name, { create: true });
            const handle = await fileHandle.createSyncAccessHandle();
            this.pool.push({ name, fileHandle, handle });
        }
    }

    private appendManifest(path: string, poolName: string): void {
        const line = new TextEncoder().encode(JSON.stringify({ v: path, p: poolName }) + '\n');
        this.manifest.write(line, { at: this.manifestSize });
        this.manifestSize += line.byteLength;
        this.manifest.flush();
    }

    private rewriteManifest(): void {
        this.manifest.truncate(0);
        this.manifestSize = 0;
        for (const [path, poolFile] of this.mapped) {
            if (!poolFile.origin) this.appendManifest(path, poolFile.name);
        }
    }

    /** Reconcile the scratch directories of instances that are no longer alive */
    private async sweep(scratchRoot: FileSystemDirectoryHandle, own: string): Promise<void> {
        for await (const [name, entry] of (scratchRoot as any).entries()) {
            if (name === own || entry.kind !== 'directory') continue;
            const dir = entry as FileSystemDirectoryHandle;
            let manifest: FileSystemSyncAccessHandle;
            try {
                const manifestFile = await dir.getFileHandle(MANIFEST_NAME);
                // The owner holds the manifest open while it is alive
                manifest = await manifestFile.createSyncAccessHandle();
            } catch (e) {
                continue;
            }
            try {
                const bytes = new Uint8Array(manifest.getSize());
                manifest.read(bytes, { at: 0 });
                manifest.close();
                const lines = new TextDecoder().decode(bytes).split('\n');
                for (const line of lines) {
                    if (!line) continue;
                    const { v, p } = JSON.parse(line);
                    const target = await this.locate(v, true);
                    if (!target) continue;
                    const poolFile = await dir.getFileHandle(p).catch(() => null);
                    if (!poolFile) continue;
                    await target.directory.removeEntry(target.name).catch(() => {});
                    await (poolFile as MovableFileHandle).move(target.directory, target.name);
                }
                await scratchRoot.removeEntry(name, { recursive: true });
            } catch (e) {
                console.warn(`Could not reconcile the OPFS scratch directory ${name}`, e);
            }
        }
    }
}
