import * as duckdb_serial from '@duckdb/duckdb-wasm/src/targets/duckdb-node-serial';
import * as duckdb_parallel from '@duckdb/duckdb-wasm/src/targets/duckdb-node-parallel';
import path from 'path';
import Worker from 'web-worker';
import initSqlJs from 'sql.js';
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
    let adb: duckdb_parallel.AsyncDuckDB | null = null;
    let worker: Worker | null = null;

    const logger = new duckdb_serial.VoidLogger();
    db = new duckdb_serial.DuckDB(
        logger,
        duckdb_serial.NodeRuntime,
        path.resolve(__dirname, '../../duckdb/dist/duckdb.wasm'),
    );
    await db.open();

    worker = new Worker(path.resolve(__dirname, '../../duckdb/dist/duckdb-node-parallel.worker.js'));
    adb = new duckdb_parallel.AsyncDuckDB(logger, worker);
    await adb.open(path.resolve(__dirname, '../../duckdb/dist/duckdb.wasm'));

    const SQL = await initSqlJs();
    let sqlDb = new SQL.Database();

    await benchmarkCompetitions(
        [
            new DuckDBSyncMatWrapper(db),
            new DuckDBSyncStreamWrapper(db),
            new DuckDBAsyncStreamWrapper(adb),
            new ArqueroWrapper(),
            new LovefieldWrapper(),
            new SQLjsWrapper(sqlDb),
            new NanoSQLWrapper(),
            new AlaSQLWrapper(),
        ],
        path.resolve(__dirname, '../../../data'),
        async (path: string) => {
            let conn = await adb!.connect();
            await adb!.addFilePath(path, path);
            const table = await conn.runQuery(`SELECT * FROM parquet_scan('${path}')`);
            await conn.disconnect();
            return table;
        },
    );
    // benchmarkFormat(() => db!);
    // benchmarkIterator(() => db!);
    // benchmarkIteratorAsync(() => adb!);

    // lovefield leaves an open handle or something.
    process.exit(0);
}

main();
