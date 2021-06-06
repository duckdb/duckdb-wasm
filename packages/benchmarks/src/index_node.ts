import * as duckdb_serial from '@duckdb/duckdb-wasm/src/targets/duckdb-node-sync';
import * as duckdb_async from '@duckdb/duckdb-wasm/src/targets/duckdb-node-async';
import path from 'path';
import Worker from 'web-worker';
import initSqlJs from 'sql.js';
import * as arrow from 'apache-arrow';
import fs from 'fs';

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
const WORKER_CONFIG = duckdb_async.configure({
    worker: path.resolve(__dirname, '../../duckdb/dist/duckdb-node-async.worker.js'),
    workerEH: path.resolve(__dirname, '../../duckdb/dist/duckdb-node-async-eh.worker.js'),
    wasm: path.resolve(__dirname, '../../duckdb/dist/duckdb.wasm'),
    wasmEH: path.resolve(__dirname, '../../duckdb/dist/duckdb-eh.wasm'),
});

const decoder = new TextDecoder();

async function main() {
    let db: duckdb_serial.DuckDB | null = null;
    let adb: duckdb_async.AsyncDuckDB | null = null;
    let worker: Worker | null = null;

    const logger = new duckdb_serial.VoidLogger();
    db = new duckdb_serial.DuckDB(logger, duckdb_serial.NodeRuntime, WORKER_CONFIG.wasmURL);
    await db.open();

    worker = new Worker(WORKER_CONFIG.workerURL);
    adb = new duckdb_async.AsyncDuckDB(logger, worker);
    await adb.open(WORKER_CONFIG.wasmURL);

    const tpchScale = '0_5';

    const SQL = await initSqlJs();
    let sqlDb = new SQL.Database(fs.readFileSync(path.resolve(__dirname, `../../../data/tpch/${tpchScale}/sqlite.db`)));

    await loadTPCHSQL(async (file: string) => {
        return decoder.decode(fs.readFileSync(path.resolve(__dirname, `../src/scripts/${file}`)));
    });

    await benchmarkCompetitions(
        [
            new (class extends DuckDBSyncMatWrapper {
                async registerFile(path: string): Promise<void> {
                    await this.db.addFilePath(path, path);
                }
            })(db),
            // new (class extends DuckDBSyncStreamWrapper {
            //     async registerFile(path: string): Promise<void> {
            //         await this.db.addFilePath(path, path);
            //     }
            // })(db),
            // new (class extends DuckDBAsyncStreamWrapper {
            //     async registerFile(path: string): Promise<void> {
            //         await this.db.addFilePath(path, path);
            //     }
            // })(adb),
            // new ArqueroWrapper(),
            // new LovefieldWrapper(),
            new SQLjsWrapper(sqlDb),
            // new NanoSQLWrapper(),
            // new AlaSQLWrapper(),
        ],
        path.resolve(__dirname, '../../../data'),
        (path: string) => {
            let conn = db!.connect();
            db!.addFilePath(path, path);
            const table = conn.runQuery(`SELECT * FROM parquet_scan('${path}')`);
            conn.disconnect();
            return Promise.resolve(table);
        },
        tpchScale,
    );
    // benchmarkFormat(() => db!);
    // benchmarkIterator(() => db!);
    // benchmarkIteratorAsync(() => adb!);

    // lovefield leaves an open handle or something.
    process.exit(0);
}

main();
