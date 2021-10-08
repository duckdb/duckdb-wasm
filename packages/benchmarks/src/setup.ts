import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb-esm';
import * as duckdb_sync from '@duckdb/duckdb-wasm/dist/duckdb-node-sync';
import * as sqljs from 'sql.js';
import initSQLJs from 'sql.js';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import Worker from 'web-worker';

export async function setupDuckDBSync(): Promise<duckdb_sync.DuckDBBindings> {
    const logger = new duckdb_sync.VoidLogger();
    const db = await new duckdb_sync.DuckDB(
        logger,
        duckdb_sync.NODE_RUNTIME,
        path.resolve(__dirname, '../../duckdb-wasm/dist/duckdb.wasm'),
    ).instantiate();
    return db;
}

export async function setupDuckDBAsync(): Promise<duckdb.AsyncDuckDB> {
    let db: duckdb.AsyncDuckDB | null = null;
    let dbWorker: Worker | null = null;
    const DUCKDB_BUNDLE = await duckdb.selectBundle({
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
    dbWorker = new Worker(DUCKDB_BUNDLE.mainWorker);
    db = new duckdb.AsyncDuckDB(logger, dbWorker);
    await db.instantiate(DUCKDB_BUNDLE.mainModule);
    return db;
}

export async function setupSqljs(): Promise<sqljs.SqlJsStatic> {
    return await initSQLJs();
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function writeReport(report: any, dst: string): Promise<void> {
    const reports = path.resolve(__dirname, '../../../reports');
    if (!fsSync.existsSync(reports)) {
        await fs.mkdir(reports);
    }
    await fs.writeFile(path.resolve(__dirname, dst), JSON.stringify(report), 'utf8');
}
