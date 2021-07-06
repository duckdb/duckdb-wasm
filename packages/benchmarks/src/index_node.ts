import * as duckdb_sync from '@duckdb/duckdb-wasm/src/targets/duckdb-node-sync';
import * as duckdb_async from '@duckdb/duckdb-wasm/src/targets/duckdb-node-async';
import path from 'path';
import Worker from 'web-worker';
import initSqlJs from 'sql.js';
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

const decoder = new TextDecoder();

async function main() {
    let db: duckdb_sync.DuckDB | null = null;
    let adb: duckdb_async.AsyncDuckDB | null = null;
    let worker: Worker | null = null;

    // Configure the worker
    const DUCKDB_CONFIG = await duckdb_async.configure({
        asyncDefault: {
            mainModule: path.resolve(__dirname, '../../duckdb-wasm/dist/duckdb.wasm'),
            mainWorker: path.resolve(__dirname, '../../duckdb-wasm/dist/duckdb-node-async.worker.js'),
        },
        asyncNext: {
            mainModule: path.resolve(__dirname, '../../duckdb-wasm/dist/duckdb-next.wasm'),
            mainWorker: path.resolve(__dirname, '../../duckdb-wasm/dist/duckdb-node-async-next.worker.js'),
        },
    });

    const logger = new duckdb_sync.VoidLogger();
    db = await new duckdb_sync.DuckDB(
        logger,
        duckdb_sync.NODE_RUNTIME,
        path.resolve(__dirname, '../../duckdb-wasm/dist/duckdb.wasm'),
    ).instantiate();

    worker = new Worker(DUCKDB_CONFIG.mainWorker);
    adb = new duckdb_async.AsyncDuckDB(logger, worker);
    await adb.instantiate(DUCKDB_CONFIG.mainModule);

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
                    await this.db.registerFileURL(path, path);
                }
            })(db),
            new (class extends DuckDBSyncStreamWrapper {
                async registerFile(path: string): Promise<void> {
                    await this.db.registerFileURL(path, path);
                }
            })(db),
            new (class extends DuckDBAsyncStreamWrapper {
                async registerFile(path: string): Promise<void> {
                    await this.db.registerFileURL(path, path);
                }
            })(adb),
            new ArqueroWrapper(),
            new LovefieldWrapper(),
            new SQLjsWrapper(sqlDb),
            new NanoSQLWrapper(),
            new AlaSQLWrapper(),
        ],
        path.resolve(__dirname, '../../../data'),
        (path: string) => {
            let conn = db!.connect();
            db!.registerFileURL(path, path);
            const table = conn.runQuery(`SELECT * FROM parquet_scan('${path}')`);
            conn.disconnect();
            return Promise.resolve(table);
        },
        tpchScale,
    );
    benchmarkFormat(() => db!);
    benchmarkIterator(() => db!);
    benchmarkIteratorAsync(() => adb!);

    // lovefield leaves an open handle or something.
    process.exit(0);
}

main();
