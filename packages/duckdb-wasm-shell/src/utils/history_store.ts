const DB_VERSION = 4;
const DB_NAME = 'DUCKDB_WASM_SHELL_HISTORY';
const TABLE_LOG_INFO = 'LOG_INFO';
const TABLE_LOG_ENTRIES = 'LOG_ENTRIES';
const HISTORY_SIZE_SHIFT = 10; // 1 << 10 = 1024 elements

interface LogEntry {
    key: number;
    when: Date;
    input: string;
}

interface LogInfo {
    key: number;
    nextEntryKey: number;
    entryCount: number;
}

export class HistoryStore {
    protected _idbFactory: IDBFactory;
    protected _idb: IDBDatabase | null;
    protected _nextEntryKey: number;
    protected _entryCount: number;

    public constructor() {
        this._idbFactory = window.indexedDB;
        this._idb = null;
        this._nextEntryKey = 0;
        this._entryCount = 0;
    }

    /// Load entire history
    public async load(): Promise<[string[], number]> {
        if (this._entryCount == 0) return [[], 0];

        // Update in indexeddb
        const tx = this._idb!.transaction([TABLE_LOG_ENTRIES, TABLE_LOG_INFO], 'readwrite');
        const logs = tx.objectStore(TABLE_LOG_ENTRIES);
        const cursor = logs.openCursor();

        // Collect all history entries
        return await new Promise((resolve, reject) => {
            const results: string[] = [];
            cursor.onsuccess = event => {
                const req = event.target as IDBRequest<IDBCursorWithValue | null>;
                if (req.result != null) {
                    results.push((req.result.value as LogEntry).input);
                    req.result.continue();
                } else {
                    resolve([results, Math.min(this._nextEntryKey, 1 << HISTORY_SIZE_SHIFT)]);
                }
            };
            cursor.onerror = reject;
        });
    }

    /// Open the indexeddb database
    public async open(): Promise<void> {
        // Create the database
        await new Promise((resolve, reject) => {
            const req = this._idbFactory.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = ev => {
                const openReq = ev.target as IDBOpenDBRequest;
                const idb = openReq.result;
                const tx = openReq.transaction!;
                this.createSchema(idb);
                tx.oncomplete = () => resolve(idb);
                tx.onerror = err => reject(err);
            };
            req.onsuccess = (_: any) => {
                this._idb = req.result;
                resolve(null);
            };
            req.onerror = err => reject(err);
        }).catch(e => console.warn("Unable to initialize indexedDB, no history persistence"));

        // Load the metadata
        await this.loadMetadata();
    }

    /// Load the log metadata (if persisted)
    protected async loadMetadata(): Promise<void> {
        if (!this._idb)
             return;
        const entry: LogInfo | null = await new Promise((resolve, _reject) => {
            const tx = this._idb!.transaction([TABLE_LOG_INFO]);
            const logInfo = tx.objectStore(TABLE_LOG_INFO);
            const req = logInfo.get(0);
            req.onsuccess = (e: Event) => resolve((e.target as IDBRequest<LogInfo>).result || null);
            req.onerror = (e: Event) => {
                console.warn(e);
                resolve(null);
            };
        });
        this._nextEntryKey = entry?.nextEntryKey || 0;
        this._entryCount = entry?.entryCount || 0;
    }

    /// Create the store schema
    protected createSchema(idb: IDBDatabase): void {
        if (idb.objectStoreNames.contains(TABLE_LOG_INFO)) {
            idb.deleteObjectStore(TABLE_LOG_INFO);
        }
        if (idb.objectStoreNames.contains(TABLE_LOG_ENTRIES)) {
            idb.deleteObjectStore(TABLE_LOG_ENTRIES);
        }
        idb.createObjectStore(TABLE_LOG_INFO, {
            keyPath: 'key',
        });
        idb.createObjectStore(TABLE_LOG_ENTRIES, {
            keyPath: 'key',
        });
    }

    /// Reset the indexeddb
    public async reset(): Promise<void> {
        this._idb?.close();
        this._idb = null;
        this._idbFactory.deleteDatabase(DB_NAME);
        await this.open();
    }

    /// Push a new entry
    public async push(input: string): Promise<void> {
        if (!this._idb)
             return;
        // Get next key
        const entryKey = this._nextEntryKey++ & ((1 << HISTORY_SIZE_SHIFT) - 1);
        this._entryCount = Math.min(this._entryCount + 1, 1 << HISTORY_SIZE_SHIFT);

        // Update in indexeddb
        const tx = this._idb!.transaction([TABLE_LOG_ENTRIES, TABLE_LOG_INFO], 'readwrite');
        const logInfo = tx.objectStore(TABLE_LOG_INFO);
        const logEntries = tx.objectStore(TABLE_LOG_ENTRIES);

        // Insert log entry and update metadata
        await Promise.all([
            new Promise((resolve, reject) => {
                const r = logEntries.put({
                    key: entryKey,
                    when: new Date(),
                    input: input,
                });
                r.onsuccess = resolve;
                r.onerror = reject;
            }),
            new Promise((resolve, reject) => {
                const r = logInfo.put({
                    key: 0,
                    nextEntryKey: this._nextEntryKey,
                    entryCount: this._entryCount,
                });
                r.onsuccess = resolve;
                r.onerror = reject;
            }),
        ]);
    }
}
