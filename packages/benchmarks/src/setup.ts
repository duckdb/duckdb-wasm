import * as duckdb_blocking from '@motherduck/duckdb-wasm/dist/duckdb-node-blocking';
import * as duckdb from '@motherduck/duckdb-wasm';
import * as sqljs from 'sql.js';
import initSQLJs from 'sql.js';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import Worker from 'web-worker';

const DUCKDB_BUNDLES = {
    mvp: {
        mainModule: path.resolve(__dirname, '../../duckdb-wasm/dist/duckdb.wasm'),
        mainWorker: path.resolve(__dirname, '../../duckdb-wasm/dist/duckdb-node.worker.cjs'),
    },
    eh: {
        mainModule: path.resolve(__dirname, '../../duckdb-wasm/dist/duckdb-eh.wasm'),
        mainWorker: path.resolve(__dirname, '../../duckdb-wasm/dist/duckdb-node-eh.worker.cjs'),
    },
};

export async function setupDuckDBSync(): Promise<duckdb_blocking.DuckDBBindings> {
    const logger = new duckdb_blocking.VoidLogger();
    const db = await duckdb_blocking.createDuckDB(DUCKDB_BUNDLES, logger, duckdb_blocking.NODE_RUNTIME);
    await db.instantiate();
    return db;
}

export async function setupDuckDBAsync(): Promise<duckdb.AsyncDuckDB> {
    let db: duckdb.AsyncDuckDB | null = null;
    let dbWorker: Worker | null = null;
    const DUCKDB_BUNDLE = await duckdb.selectBundle(DUCKDB_BUNDLES);
    const logger = new duckdb_blocking.VoidLogger();
    dbWorker = new Worker(DUCKDB_BUNDLE.mainWorker);
    db = new duckdb.AsyncDuckDB(logger, dbWorker);
    await db.instantiate(DUCKDB_BUNDLE.mainModule);
    return db;
}

export async function setupSqljs(): Promise<sqljs.SqlJsStatic> {
    return await initSQLJs();
}

// eslint-disable-eh-line qtypescript-eslint/explicit-module-boundary-types
export async function writeReport(report: any, dst: string): Promise<void> {
    const reports = path.resolve(__dirname, '../../../reports');
    if (!fsSync.existsSync(reports)) {
        await fs.mkdir(reports);
    }
    const out = path.resolve(reports, dst);
    console.log(`writing report to: ${out.toString()}`);
    await fs.writeFile(out, JSON.stringify(report), 'utf8');
}
