/**
 * OPFS scratch: synchronous creation of `opfs://` files.
 *
 * OPFS sync access handles can only be acquired asynchronously, but DuckDB opens files from synchronous code in the
 * middle of a query. Real files (`opfs://<path>` at `/duckdb/fs/<path>`) therefore have their handles prepared ahead
 * of a query. Files DuckDB names at runtime (temporary files of a COPY, write-ahead logs, spill files, ...) cannot be
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
 * Files below `opfs://.scratch/` are ephemeral: they live in a pool file for as long as they are open and are never
 * moved to /duckdb/fs. DuckDB's temporary directory (spilling) points there.
 */

export const OPFS_PREFIX = 'opfs://';
/** Virtual directory of ephemeral files, DuckDB's temporary directory */
export const OPFS_SCRATCH_DIR = 'opfs://.scratch';
const OPFS_SCRATCH_PREFIX = OPFS_SCRATCH_DIR + '/';
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
}

/** A real file: its directory and name under /duckdb/fs, or at the root for the legacy layout */
interface RealFile {
    directory: FileSystemDirectoryHandle;
    name: string;
    fileHandle: FileSystemFileHandle;
    handle: FileSystemSyncAccessHandle;
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
    /** Virtual paths served from a real file */
    private real = new Map<string, RealFile>();
    /** Ephemeral files below opfs://.scratch/, pool files that are never moved into place */
    private ephemeral = new Map<string, PoolFile>();
    /** Real files removed or replaced, deleted at the next checkpoint */
    private pendingDelete = new Map<string, RealFile>();

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
        await scratch.preopen(fsDir, OPFS_PREFIX);
        await scratch.replenish();
        return scratch;
    }

    /** Open sync access handles for every file below a directory. Files another instance holds open are skipped */
    private async preopen(directory: FileSystemDirectoryHandle, prefix: string): Promise<void> {
        for await (const [name, entry] of (directory as any).entries()) {
            const path = prefix + name;
            if (entry.kind === 'directory') {
                await this.preopen(entry as FileSystemDirectoryHandle, path + '/');
                continue;
            }
            const fileHandle = entry as FileSystemFileHandle;
            try {
                const handle = await fileHandle.createSyncAccessHandle();
                this.real.set(path, { directory, name, fileHandle, handle });
            } catch (e: any) {
                console.warn(`OPFS file ${path} is in use by another instance and not available here`);
            }
        }
    }

    /** The handles of the sync access registry are keyed by virtual path, this is the view of them */
    get handles(): Map<string, FileSystemSyncAccessHandle> {
        const out = new Map<string, FileSystemSyncAccessHandle>();
        for (const [path, file] of this.real) out.set(path, file.handle);
        for (const [path, file] of this.mapped) out.set(path, file.handle);
        for (const [path, file] of this.ephemeral) out.set(path, file.handle);
        return out;
    }

    /** Get the sync access handle of a virtual path, if it is open */
    getHandle(path: string): FileSystemSyncAccessHandle | undefined {
        return this.mapped.get(path)?.handle ?? this.real.get(path)?.handle ?? this.ephemeral.get(path)?.handle;
    }

    /** Does the file exist? */
    exists(path: string): boolean {
        return this.mapped.has(path) || this.real.has(path) || this.ephemeral.has(path);
    }

    /** Is the path the ephemeral directory or a file in it? */
    static isEphemeral(path: string): boolean {
        return path === OPFS_SCRATCH_DIR || path.startsWith(OPFS_SCRATCH_PREFIX);
    }

    /** The names of the ephemeral files, DuckDB lists its temporary directory */
    listEphemeral(): string[] {
        return [...this.ephemeral.keys()].map(path => path.slice(OPFS_SCRATCH_PREFIX.length));
    }

    /** Is there anything for a checkpoint to do? */
    get dirty(): boolean {
        return this.mapped.size > 0 || this.pendingDelete.size > 0 || this.pool.length < this.poolSize / 2;
    }

    // -------------------------------------------------------------------------------------------------------------
    // Asynchronous: between queries

    /** Prepare a real file ahead of a query. Returns false if the file does not exist, it is then created in the
     * scratch when first opened */
    async prepare(path: string): Promise<boolean> {
        if (this.exists(path) || this.pendingDelete.has(path) || OPFSScratch.isEphemeral(path)) {
            return this.exists(path);
        }
        let located;
        try {
            located = await this.locate(path, false);
        } catch (e: any) {
            throw new Error(`OPFS prepare of ${path} failed: ${e?.message ?? e}`);
        }
        if (!located) return false;
        const handle = await located.fileHandle.createSyncAccessHandle();
        this.debug('scratch prepared', path, `size=${handle.getSize()}`);
        this.real.set(path, { ...located, handle });
        return true;
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
        for (const [path, poolFile] of this.mapped) {
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
            this.real.set(path, { directory: target.directory, name: target.name, fileHandle, handle });
            this.mapped.delete(path);
        }
        this.rewriteManifest();
        await this.replenish();
    }

    /** Close everything, the scratch directory of a cleanly closed instance is removed */
    async close(): Promise<void> {
        await this.checkpoint();
        for (const file of this.real.values()) file.handle.close();
        for (const file of this.pool) file.handle.close();
        for (const file of this.ephemeral.values()) file.handle.close();
        this.real.clear();
        this.pool = [];
        this.ephemeral.clear();
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
        const poolFile = this.pool.pop();
        if (!poolFile) {
            throw new Error(
                `Cannot create ${path}: the OPFS scratch pool of ${this.poolSize} files is exhausted, ` +
                    `a single query created more files than that`,
            );
        }
        if (OPFSScratch.isEphemeral(path)) {
            // Lives in the pool file until it is removed, nothing to record
            this.ephemeral.set(path, poolFile);
            return poolFile.handle;
        }
        this.pendingDelete.delete(path);
        this.mapped.set(path, poolFile);
        this.appendManifest(path, poolFile.name);
        return poolFile.handle;
    }

    /** Release a real file's handle without removing the file (DuckDB dropped it from its registry) */
    release(path: string): void {
        this.debug('scratch release', path);
        const file = this.real.get(path);
        if (file) {
            file.handle.flush();
            file.handle.close();
            this.real.delete(path);
        }
        // mapped files stay until the checkpoint has moved them into place
    }

    /** Move a file: a manifest edit, the content is never copied */
    move(from: string, to: string): void {
        if (from === to) return;
        this.debug('scratch move', from, to);
        const source = this.mapped.get(from) ?? this.ephemeral.get(from);
        const realSource = this.real.get(from);
        if (!source && !realSource) {
            throw new Error(`Cannot move ${from}: the file is not open`);
        }
        // Whatever was at the target is removed
        this.removeInternal(to);
        if (source && OPFSScratch.isEphemeral(to)) {
            this.mapped.delete(from);
            this.ephemeral.delete(from);
            this.ephemeral.set(to, source);
            return;
        }
        if (source) {
            this.mapped.delete(from);
            this.ephemeral.delete(from);
            this.mapped.set(to, source);
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

    private removeInternal(path: string): void {
        const ephemeral = this.ephemeral.get(path);
        if (ephemeral) {
            this.ephemeral.delete(path);
            ephemeral.handle.truncate(0);
            this.pool.push(ephemeral);
            return;
        }
        const poolFile = this.mapped.get(path);
        if (poolFile) {
            this.mapped.delete(path);
            poolFile.handle.truncate(0);
            if (poolFile.origin) {
                // Was a real file that moved through the scratch, it is deleted at the checkpoint
                poolFile.handle.close();
                this.pendingDelete.set(`${path}\0${this.poolCounter++}`, { ...poolFile.origin, fileHandle: poolFile.fileHandle, handle: poolFile.handle });
            } else {
                this.pool.push(poolFile);
            }
        }
        const real = this.real.get(path);
        if (real) {
            real.handle.close();
            this.real.delete(path);
            this.pendingDelete.set(path, real);
        }
    }

    // -------------------------------------------------------------------------------------------------------------
    // Internals

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
        try {
            const directory = await resolve(this.fsDir, create);
            const fileHandle = await directory.getFileHandle(name, { create });
            return { directory, name, fileHandle };
        } catch (e: any) {
            if (e?.name !== 'NotFoundError') throw e;
        }
        if (create) return null;
        // The previous layout kept opfs:// files at the root
        try {
            const directory = await resolve(this.root, false);
            const fileHandle = await directory.getFileHandle(name, { create: false });
            return { directory, name, fileHandle };
        } catch (e: any) {
            if (e?.name !== 'NotFoundError') throw e;
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
