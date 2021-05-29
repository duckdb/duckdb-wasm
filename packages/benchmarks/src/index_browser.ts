import * as duckdb_serial from '@duckdb/duckdb-wasm/src/targets/duckdb-browser-serial';
import * as duckdb_parallel from '@duckdb/duckdb-wasm/src/targets/duckdb-browser-parallel';
import Worker from 'web-worker';
import sqljs from 'sql.js';
import * as arrow from 'apache-arrow';

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
} from './db_wrappers';

async function main() {
    let db: duckdb_serial.DuckDB | null = null;
    let db1: duckdb_serial.DuckDB | null = null;
    let adb: duckdb_parallel.AsyncDuckDB | null = null;
    let worker: Worker | null = null;

    const logger = new duckdb_serial.VoidLogger();
    db = new duckdb_serial.DuckDB(logger, duckdb_serial.BrowserRuntime, '/static/duckdb.wasm');
    await db.open();
    db1 = new duckdb_serial.DuckDB(logger, duckdb_serial.BrowserRuntime, '/static/duckdb.wasm');
    await db1.open();

    worker = new Worker('/static/duckdb-browser-parallel.worker.js');
    adb = new duckdb_parallel.AsyncDuckDB(logger, worker);
    await adb.open('/static/duckdb.wasm');

    const SQL = await sqljs({
        locateFile: file => `/sqljs/${file}`,
    });
    let sqlDb = new SQL.Database();

    await benchmarkCompetitions(
        [
            new DuckDBSyncMatWrapper(db),
            new DuckDBSyncStreamWrapper(db1),
            new (class extends DuckDBAsyncStreamWrapper {
                async registerFile(path: string): Promise<void> {
                    this.db.addFileBlob(path, await (await fetch(path)).blob());
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
            await adb!.addFileBlob(path, await (await fetch(path)).blob);
            const table = await conn.runQuery(`SELECT * FROM parquet_scan('${path}')`);
            await conn.disconnect();
            return table;
        },
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
