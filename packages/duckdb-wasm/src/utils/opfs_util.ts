export const REGEX_OPFS_FILE = /'(opfs:\/\/\S*?)'/g;
export const REGEX_OPFS_PROTOCOL = /(opfs:\/\/\S*?)/g;

export function isOPFSProtocol(path: string): boolean {
    return path.search(REGEX_OPFS_PROTOCOL) > -1;
}

export function searchOPFSFiles(text: string) {
    return [...text.matchAll(REGEX_OPFS_FILE)].map(match => match[1]);
}

type HandleEntry = { name: string; handle: FileSystemSyncAccessHandle };

export type TmpPoolConfig = { maxUnused?: number; minUnused?: number };

/**
 * TmpPool manages pre-allocated OPFS file handles for temporary files.
 *
 * DuckDB's file operations (openFile, dropFile, etc.) are synchronous C++ calls
 * that cannot be made async. However, OPFS file creation requires async APIs.
 * When DuckDB needs to create temporary files for spilling data to disk, it
 * calls openFile synchronously, expecting an immediate file handle.
 *
 * To work around this API mismatch, we pre-create a pool of OPFS files with
 * their sync access handles during the async temp directory registration. When
 * DuckDB needs a temp file, we can synchronously hand out one of these
 * pre-created handles from the pool. When the file is closed, we clear it and
 * return it to the pool for reuse.
 */
export class TmpPool {
  public readonly path: string;
  private dir: FileSystemDirectoryHandle;
  private maxUnused: number;
  private minUnused: number;
  private pool: HandleEntry[] = []; // unused files.
  private openMap = new Map<string, HandleEntry>(); // checked out files.
  private nextId = 1;
  private refillInFlight = false;

  constructor(
    path: string,
    dir: FileSystemDirectoryHandle,
    maxUnused: number = 4,
    minUnused: number = 2
  ) {
    if (minUnused >= maxUnused) throw new Error("minUnused must be < maxUnused");
    this.path = canonicalDirUrl(path);
    this.dir = dir;
    this.maxUnused = maxUnused;
    this.minUnused = minUnused;
  }

  async init(): Promise<void> { await this.refillTo(this.maxUnused); }

  matches(path: string): boolean {
    const canonical = canonicalDirUrl(path);
    return canonical === this.path || canonical.startsWith(this.path);
  }

  openFile(path: string): FileSystemSyncAccessHandle {
    const existing = this.openMap.get(path); if (existing) return existing.handle;
    if (this.pool.length === 0) throw new Error("OPFS tmp pool exhausted");
    const entry = this.pool.pop()!; this.openMap.set(path, entry);
    if (this.pool.length < this.minUnused) this.maybeRefillAsync();
    return entry.handle;
  }

  dropFile(path: string): void {
    const entry = this.openMap.get(path); if (!entry) return;
    entry.handle.flush();

    if (this.pool.length >= this.maxUnused) {
      this.asyncDelete(entry).catch(() => {});
    } else {
      entry.handle.truncate(0);
      this.pool.push(entry);
    }
    this.openMap.delete(path);
  }

  async destroy(): Promise<void> {
    await Promise.all(this.pool.splice(0).map(e => this.asyncDelete(e)));
  }

  private async createEntry(): Promise<HandleEntry> {
    const name = `tmp${this.nextId++}`;
    const fh = await this.dir.getFileHandle(name, { create: true });
    const sah = await fh.createSyncAccessHandle();
    sah.truncate(0);
    return { name, handle: sah };
  }
  private async refillTo(target: number): Promise<void> {
    while (this.pool.length < target) {
      const e = await this.createEntry(); this.pool.push(e);
    }
  }
  private maybeRefillAsync() {
    if (this.refillInFlight) return;
    this.refillInFlight = true;
    this.refillTo(this.maxUnused).finally(() => { this.refillInFlight = false; });
  }
  private async asyncDelete(e: HandleEntry) {
    try { e.handle.flush(); } catch { /* ignore errors */ }
    try { e.handle.close(); } catch { /* ignore errors */ }
    try { await this.dir.removeEntry(e.name); } catch { /* ignore errors */ }
  }
}

export function canonicalDirUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export async function resolveOpfsDirectory(opfsUrl: string): Promise<FileSystemDirectoryHandle> {
  const root = await (navigator as any).storage.getDirectory();
  const rel = opfsUrl.slice("opfs://".length).replace(/^\/+/, "");
  const parts = rel.split("/").filter(Boolean);
  let dir: FileSystemDirectoryHandle = root;
  for (const p of parts) {
    dir = await dir.getDirectoryHandle(p, { create: true });
  }
  return dir;
}

export async function createOPFSTempPool(opfsDirUrl: string, cfg: TmpPoolConfig = {}) : Promise<TmpPool> {
  const key = canonicalDirUrl(opfsDirUrl);
  const dir = await resolveOpfsDirectory(key);
  const maxUnused = cfg.maxUnused ?? 10;
  const minUnused = cfg.minUnused ?? 2;
  const pool = new TmpPool(key, dir, maxUnused, minUnused);
  await pool.init();
  return pool;
}
