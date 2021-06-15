import * as duckdb_sync from '../src/targets/duckdb-node-sync-eh';
import * as duckdb_async from '../src/targets/duckdb-node-async';
import path from 'path';
import Worker from 'web-worker';
import fs from 'fs';

// Loading debug symbols, especially for WASM take insanely long so we just disable the test timeout
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

// Resolve a buffer by fetching from disk
const dataDir = path.resolve(__dirname, '../../../data');
const resolveBuffer = (url: string) => {
    const p = path.join(dataDir, url);
    if (!fs.existsSync(p)) return null;
    return new Uint8Array(fs.readFileSync(p));
};

// Resolve test data
const resolveData = async (url: string) => {
    switch (url) {
        case '/uni/all.zip':
            return await resolveBuffer('/uni/all.zip');
        case '/uni/assistenten.parquet':
            return await resolveBuffer('/uni/assistenten.parquet');
        case '/uni/studenten.parquet':
            return await resolveBuffer('/uni/studenten.parquet');
        case '/uni/hoeren.parquet':
            return await resolveBuffer('/uni/hoeren.parquet');
        case '/uni/vorlesungen.parquet':
            return await resolveBuffer('/uni/vorlesungen.parquet');
        default:
            return null;
    }
};

// Test environment
let db: duckdb_sync.DuckDB | null = null;
let adb: duckdb_async.AsyncDuckDB | null = null;
let worker: Worker | null = null;

beforeAll(async () => {
    // Configure the worker
    const DUCKDB_CONFIG = await duckdb_async.configure({
        asyncDefault: {
            mainModule: path.resolve(__dirname, './duckdb.wasm'),
            mainWorker: path.resolve(__dirname, './duckdb-node-async.worker.js'),
        },
        asyncEH: {
            mainModule: path.resolve(__dirname, './duckdb-eh.wasm'),
            mainWorker: path.resolve(__dirname, './duckdb-node-async-eh.worker.js'),
        },
    });

    const logger = new duckdb_sync.VoidLogger();
    db = new duckdb_sync.DuckDB(logger, duckdb_sync.NODE_RUNTIME, path.resolve(__dirname, './duckdb-eh.wasm'));
    await db.open();

    worker = new Worker(DUCKDB_CONFIG.mainWorker);
    adb = new duckdb_async.AsyncDuckDB(logger, worker);
    await adb.open(DUCKDB_CONFIG.mainModule);
});

afterAll(async () => {
    if (worker) worker.terminate();
});

import { testBindings } from './bindings.test';
import { testBatchStream } from './batch_stream.test';
import { testFilesystem } from './filesystem.test';
import { testAsyncBatchStream } from './batch_stream_async.test';
import { testZip, testZipAsync } from './zip.test';
import { testJSONImport, testJSONImportAsync } from './import_json.test';
import { testTokenization, testTokenizationAsync } from './tokenizer.test';

testBindings(() => db!);
testBatchStream(() => db!);
testAsyncBatchStream(() => adb!);
testFilesystem(() => adb!, resolveData, dataDir);
testZip(() => db!, resolveData);
testZipAsync(() => adb!, resolveData);
testJSONImport(() => db!);
testJSONImportAsync(() => adb!);
testTokenization(() => db!);
testTokenizationAsync(() => adb!);
