import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb.module';
import * as duckdb_sync from '@duckdb/duckdb-wasm/dist/duckdb-node-sync';
import path from 'path';
import Worker from 'web-worker';
import initSqlJs from 'sql.js';
import fs from 'fs';

import { benchmarkFormat } from './format_benchmark';
import { benchmarkIterator } from './iterator_benchmark';
import { benchmarkIteratorAsync } from './iterator_benchmark_async';
import { benchmarkCompetitions } from './competition_benchmark';
import {
    AlaSQLProxy,
    ArqueroProxy,
    DuckDBSyncMaterializedProxy,
    DuckDBSyncStreamProxy,
    DuckDBAsyncStreamProxy,
    LovefieldProxy,
    NanoSQLProxy,
    SQLjsProxy,
    loadTPCHSQL,
} from './db_config';

const decoder = new TextDecoder();

async function main() {
    let db: duckdb_sync.DuckDB | null = null;
    let adb: duckdb.AsyncDuckDB | null = null;
    let worker: Worker | null = null;

    // Configure the worker
    const DUCKDB_BUNDLE = await duckdb.selectBundle({
        asyncDefault: {
            mainModule: path.resolve(__dirname, '../../../duckdb-wasm/dist/duckdb.wasm'),
            mainWorker: path.resolve(__dirname, '../../../duckdb-wasm/dist/duckdb-node-async.worker.js'),
        },
        asyncNext: {
            mainModule: path.resolve(__dirname, '../../../duckdb-wasm/dist/duckdb-next.wasm'),
            mainWorker: path.resolve(__dirname, '../../../duckdb-wasm/dist/duckdb-node-async-next.worker.js'),
        },
    });

    const logger = new duckdb_sync.VoidLogger();
    db = await new duckdb_sync.DuckDB(
        logger,
        duckdb_sync.NODE_RUNTIME,
        path.resolve(__dirname, '../../../duckdb-wasm/dist/duckdb.wasm'),
    ).instantiate();

    worker = new Worker(DUCKDB_BUNDLE.mainWorker);
    adb = new duckdb.AsyncDuckDB(logger, worker);
    await adb.instantiate(DUCKDB_BUNDLE.mainModule);

    const tpchScale = '0_5';

    const sqljs = await initSqlJs();
    const sqljsDB = new sqljs.Database(
        fs.readFileSync(path.resolve(__dirname, `../../../data/tpch/${tpchScale}/sqlite.db`)),
    );

    await loadTPCHSQL(async (file: string) => {
        return decoder.decode(fs.readFileSync(path.resolve(__dirname, `../../scripts/${file}`)));
    });

    await benchmarkCompetitions(
        [
            new (class extends DuckDBSyncMaterializedProxy {
                async registerFile(p: string): Promise<void> {
                    await this.db.registerFileURL(p, p);
                }
            })(db),
            new (class extends DuckDBSyncStreamProxy {
                async registerFile(p: string): Promise<void> {
                    await this.db.registerFileURL(p, p);
                }
            })(db),
            new (class extends DuckDBAsyncStreamProxy {
                async registerFile(p: string): Promise<void> {
                    await this.db.registerFileURL(p, p);
                }
            })(adb),
            new ArqueroProxy(),
            new LovefieldProxy(),
            new SQLjsProxy(sqljsDB),
            new NanoSQLProxy(),
            new AlaSQLProxy(),
        ],
        path.resolve(__dirname, '../../../data'),
        (p: string) => {
            const conn = db!.connect();
            db!.registerFileURL(p, p);
            const table = conn.runQuery(`SELECT * FROM parquet_scan('${path}')`);
            conn.close();
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
