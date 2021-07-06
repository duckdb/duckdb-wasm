import * as duckdb_sync from '@duckdb/duckdb-wasm/src/targets/duckdb-browser-sync';
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

async function main() {
    let db: duckdb_sync.DuckDB | null = null;
    let adb: duckdb_async.AsyncDuckDB | null = null;
    let worker: Worker | null = null;

    const DUCKDB_CONFIG = await duckdb_async.configure({
        asyncDefault: {
            mainModule: '/static/duckdb.wasm',
            mainWorker: '/static/duckdb-browser-async.worker.js',
        },
        asyncNext: {
            mainModule: '/static/duckdb-next.wasm',
            mainWorker: '/static/duckdb-browser-async-next.worker.js',
        },
        asyncNextCOI: {
            mainModule: '/static/duckdb-next-coi.wasm',
            mainWorker: '/static/duckdb-browser-async-next-coi.worker.js',
            pthreadWorker: '/static/duckdb-browser-async-next-coi.pthread.worker.js',
        },
    });
    const logger = new duckdb_sync.VoidLogger();
    db = new duckdb_sync.DuckDB(logger, duckdb_sync.BROWSER_RUNTIME, DUCKDB_CONFIG.mainModule);
    await db.instantiate();

    worker = new Worker(DUCKDB_CONFIG.mainWorker!);
    adb = new duckdb_async.AsyncDuckDB(logger, worker);
    await adb.instantiate(DUCKDB_CONFIG.mainModule, DUCKDB_CONFIG.pthreadWorker);

    const tpchScale = '0_5';

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
            // new (class extends DuckDBSyncMatWrapper {
            //     async registerFile(path: string): Promise<void> {
            //         await this.db.addFileBuffer(path, new Uint8Array(await (await fetch(path)).arrayBuffer()));
            //     }
            // })(db),
            // new (class extends DuckDBSyncStreamWrapper {
            //     async registerFile(path: string): Promise<void> {
            //         await this.db.addFileBuffer(path, new Uint8Array(await (await fetch(path)).arrayBuffer()));
            //     }
            // })(db),
            // new (class extends DuckDBAsyncStreamWrapper {
            //     async registerFile(path: string): Promise<void> {
            //         await this.db.addFileBlob(path, await (await fetch(path)).blob());
            //     }
            // })(adb),
            // new ArqueroWrapper(),
            // new LovefieldWrapper(),
            new SQLjsWrapper(sqlDb),
            // new NanoSQLWrapper(),
            // new AlaSQLWrapper(),
        ],
        '/data',
        async (path: string) => {
            let conn = await adb!.connect();
            await adb!.registerFileBuffer(path, new Uint8Array(await (await fetch(path)).arrayBuffer()));
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

    karma.result({ success: true, suite: [], log: [] });
    karma.complete({});
};
