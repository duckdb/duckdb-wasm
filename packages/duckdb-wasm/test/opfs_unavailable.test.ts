import { AsyncDuckDB, AsyncDuckDBConnection, DuckDBBundle, DuckDBConfig, VoidLogger } from '../src/';

/** How a browser refuses OPFS although it has the API: navigator.storage.getDirectory() rejects */
interface Refusal {
    /** The browser that refuses this way */
    browser: string;
    /** The DOMException name it rejects with */
    name: string;
}

const REFUSALS: Refusal[] = [
    { browser: 'Firefox private browsing', name: 'SecurityError' },
    { browser: 'WebKit ephemeral sessions', name: 'UnknownError' },
];

const REFUSAL_MESSAGE = 'OPFS refused by the test';

/** A worker whose navigator.storage.getDirectory() rejects the way a browser that refuses OPFS does. Only the
 * single-threaded worker loads as a classic script that can be wrapped */
function refusingWorker(bundle: DuckDBBundle, refusal: Refusal): Worker {
    const script =
        `StorageManager.prototype.getDirectory = () => ` +
        `Promise.reject(new DOMException(${JSON.stringify(REFUSAL_MESSAGE)}, ${JSON.stringify(refusal.name)}));\n` +
        `importScripts(${JSON.stringify(bundle.mainWorker)});\n`;
    return new Worker(URL.createObjectURL(new Blob([script], { type: 'text/javascript' })));
}

/** A database in its own worker, so every test starts without an OPFS mount */
class Instance {
    db: AsyncDuckDB | null = null;
    conn: AsyncDuckDBConnection | null = null;

    async start(bundle: DuckDBBundle, refusal?: Refusal): Promise<AsyncDuckDB> {
        const worker = refusal ? refusingWorker(bundle, refusal) : new Worker(bundle.mainWorker!);
        this.db = new AsyncDuckDB(new VoidLogger(), worker);
        await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
        return this.db;
    }

    async open(bundle: DuckDBBundle, config: DuckDBConfig, refusal?: Refusal): Promise<AsyncDuckDBConnection> {
        const db = this.db ?? (await this.start(bundle, refusal));
        await db.open(config);
        this.conn = await db.connect();
        return this.conn;
    }

    async stop(): Promise<void> {
        await this.conn?.close().catch(() => {});
        await this.db?.terminate().catch(() => {});
        this.conn = null;
        this.db = null;
    }
}

async function homeDirectory(conn: AsyncDuckDBConnection): Promise<string | null> {
    const result = await conn.query(`SELECT current_setting('home_directory') AS home`);
    return result.getChildAt(0)?.get(0) ?? null;
}

async function selectAnswer(conn: AsyncDuckDBConnection): Promise<number> {
    const result = await conn.query(`SELECT 42::INTEGER AS answer`);
    return result.getChildAt(0)?.get(0);
}

/** DuckDB where the browser refuses OPFS. `bundle` is a single-threaded bundle */
export function testOPFSUnavailable(bundle: () => DuckDBBundle): void {
    for (const refusal of REFUSALS) {
        describe(`OPFS refused by the browser (${refusal.name}, as in ${refusal.browser})`, () => {
            const instance = new Instance();

            afterEach(async () => {
                await instance.stop();
            });

            it('opens without OPFS: no opfs://home', async () => {
                const conn = await instance.open(bundle(), {}, refusal);
                expect(await selectAnswer(conn)).toEqual(42);
                expect(await homeDirectory(conn)).not.toEqual('opfs://home');
            });

            it('opens again in the same worker', async () => {
                await instance.open(bundle(), {}, refusal);
                const conn = await instance.open(bundle(), {}, refusal);
                expect(await selectAnswer(conn)).toEqual(42);
            });

            it('fails an opfs:// database with the refusal', async () => {
                await instance.start(bundle(), refusal);
                await expectAsync(instance.db!.open({ path: 'opfs://opfs_refused.db' })).toBeRejectedWithError(
                    new RegExp(REFUSAL_MESSAGE),
                );
            });
        });
    }
}
