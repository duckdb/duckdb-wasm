import * as duckdb_serial from '@duckdb/duckdb-wasm/src/targets/duckdb-browser-sync';
import * as duckdb_async from '@duckdb/duckdb-wasm/src/targets/duckdb-browser-async';
import Worker from 'web-worker';
import sqljs from 'sql.js';

import { benchmarkFormat } from './format_benchmark';
import { benchmarkIterator } from './iterator_benchmark';
import { benchmarkIteratorAsync } from './iterator_benchmark_async';
import { benchmarkCompetitions } from './competition_benchmark';
import {
    AlaSQLWrapper,
    ArqueroWrapper,
    DuckDBSyncMatWrapper,
    DuckDBSyncStreamWrapper,
    DuckDBAsyncStreamWrapper,
    LovefieldWrapper,
    NanoSQLWrapper,
    SQLjsWrapper,
    loadTPCHSQL,
} from './db_wrappers';

// Configure the worker
const WORKER_BUNDLES = {
    worker: '/static/duckdb-browser-async.worker.js',
    workerEH: '/static/duckdb-browser-async-eh.worker.js',
    workerEHMT: '/static/duckdb-browser-async-eh-mt.worker.js',
    wasm: '/static/duckdb.wasm',
    wasmEH: '/static/duckdb-eh.wasm',
    wasmEHMT: '/static/duckdb-eh-mt.wasm',
};
const WORKER_CONFIG = duckdb_async.configure(WORKER_BUNDLES);

async function main() {
    console.log('Selected DuckDB: ' + WORKER_CONFIG.wasmURL);

    let db: duckdb_serial.DuckDB | null = null;
    let adb: duckdb_async.AsyncDuckDB | null = null;
    let worker: Worker | null = null;

    const logger = new duckdb_serial.VoidLogger();
    db = new duckdb_serial.DuckDB(logger, duckdb_serial.BrowserRuntime, '/static/duckdb.wasm');
    await db.open();

    worker = new Worker(WORKER_CONFIG.workerURL);
    adb = new duckdb_async.AsyncDuckDB(logger, worker);
    await adb.open(WORKER_CONFIG.wasmURL.toString());

    // Can't load files bigger than 512MB in karma.. need to find a solution.
    const tpchScale = '0_1';

    const SQL = await sqljs({
        locateFile: file => `/sqljs/${file}`,
    });

    let sqlDb = new SQL.Database(
        new Uint8Array(await (await fetch(`/data/tpch/${tpchScale}/sqlite.db`)).arrayBuffer()),
    );

    await loadTPCHSQL(async (filename: string) => {
        return await (await fetch(`/scripts/${filename}`)).text();
    });

    await benchmarkCompetitions(
        [
            new (class extends DuckDBSyncMatWrapper {
                async registerFile(path: string): Promise<void> {
                    await this.db.addFileBuffer(path, new Uint8Array(await (await fetch(path)).arrayBuffer()));
                }
            })(db),
            // new (class extends DuckDBSyncStreamWrapper {
            //     async registerFile(path: string): Promise<void> {
            //         await this.db.addFileBuffer(path, new Uint8Array(await (await fetch(path)).arrayBuffer()));
            //     }
            // })(db),
            new (class extends DuckDBAsyncStreamWrapper {
                async registerFile(path: string): Promise<void> {
                    await this.db.addFileBlob(path, await (await fetch(path)).blob());
                }
            })(adb),
            new ArqueroWrapper(),
            new LovefieldWrapper(),
            new SQLjsWrapper(sqlDb),
            new NanoSQLWrapper(),
            new AlaSQLWrapper(),
        ],
        '/data',
        async (path: string) => {
            let conn = await adb!.connect();
            await adb!.addFileBlob(path, await (await fetch(path)).blob());
            const table = await conn.runQuery(`SELECT * FROM parquet_scan('${path}')`);
            await conn.disconnect();
            return table;
        },
        tpchScale,
    );
    // benchmarkFormat(() => db!);
    // benchmarkIterator(() => db!);
    // benchmarkIteratorAsync(() => adb!);
}

(window as any).karmaCustomEnv = {};
(window as any).karmaCustomEnv.execute = async function (karma: any, window: any) {
    await main();

    karma.result({ success: true });
    karma.complete({});
};
