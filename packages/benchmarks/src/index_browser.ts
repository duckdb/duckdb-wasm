import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb.module';
import * as duckdb_sync from '@duckdb/duckdb-wasm/dist/duckdb-browser-sync';
import Worker from 'web-worker';
import initSQLJs from 'sql.js';

import { benchmarkFormat } from './format_benchmark';
import { benchmarkIterator } from './iterator_benchmark';
import { benchmarkIteratorAsync } from './iterator_benchmark_async';
import { benchmarkCompetitions } from './competition_benchmark';
import {
    AlaSQLProxy,
    ArqueroProxy,
    DuckDBSyncMaterializedProxy as DuckDBSyncMaterialized,
    DuckDBSyncStreamProxy as DuckDBSyncStream,
    DuckDBAsyncStreamProxy as DuckDBAsyncStream,
    LovefieldProxy,
    NanoSQLProxy,
    SQLjsProxy,
    loadTPCHSQL,
} from './db_config';

async function main() {
    let db: duckdb_sync.DuckDB | null = null;
    let adb: duckdb.AsyncDuckDB | null = null;
    let worker: Worker | null = null;

    const DUCKDB_BUNDLE = await duckdb.selectBundle({
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
    db = new duckdb_sync.DuckDB(logger, duckdb_sync.BROWSER_RUNTIME, '/static/duckdb.wasm');
    await db.instantiate();

    worker = new Worker(DUCKDB_BUNDLE.mainWorker!);
    adb = new duckdb.AsyncDuckDB(logger, worker);
    await adb.instantiate(DUCKDB_BUNDLE.mainModule, DUCKDB_BUNDLE.pthreadWorker);

    const tpchScale = '0_5';

    const sqljsConfig = await initSQLJs({
        locateFile: file => `/sqljs/${file}`,
    });
    const sqljsDB = new sqljsConfig.Database(
        new Uint8Array(await (await fetch(`/data/tpch/${tpchScale}/sqlite.db`)).arrayBuffer()),
    );

    await loadTPCHSQL(async (filename: string) => {
        return await (await fetch(`/scripts/${filename}`)).text();
    });

    await benchmarkCompetitions(
        [
            new (class extends DuckDBSyncMaterialized {
                async registerFile(path: string): Promise<void> {
                    await this.db.registerFileBuffer(path, new Uint8Array(await (await fetch(path)).arrayBuffer()));
                }
            })(db),
            new (class extends DuckDBSyncStream {
                async registerFile(path: string): Promise<void> {
                    await this.db.registerFileBuffer(path, new Uint8Array(await (await fetch(path)).arrayBuffer()));
                }
            })(db),
            new (class extends DuckDBAsyncStream {
                async registerFile(path: string): Promise<void> {
                    await this.db.registerFileBuffer(path, new Uint8Array(await (await fetch(path)).arrayBuffer()));
                }
            })(adb),
            new ArqueroProxy(),
            new LovefieldProxy(),
            new SQLjsProxy(sqljsDB),
            new NanoSQLProxy(),
            new AlaSQLProxy(),
        ],
        '/data',
        async (path: string) => {
            const conn = await adb!.connect();
            await adb!.registerFileBuffer(path, new Uint8Array(await (await fetch(path)).arrayBuffer()));
            const table = await conn.runQuery(`SELECT * FROM parquet_scan('${path}')`);
            await conn.close();
            return table;
        },
        tpchScale,
    );
    benchmarkFormat(() => db!);
    benchmarkIterator(() => db!);
    benchmarkIteratorAsync(() => adb!);
}

(window as any).karmaCustomEnv = {};
(window as any).karmaCustomEnv.execute = async function (karma: any, window: any) {
    await main();

    karma.result({ success: true, suite: [], log: [] });
    karma.complete({});
};
