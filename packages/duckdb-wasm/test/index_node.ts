import * as duckdb_blocking from '../src/targets/duckdb-node-blocking';
import * as duckdb from '../src/targets/duckdb';
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
let db: duckdb_blocking.DuckDBBindings | null = null;
let adb: duckdb.AsyncDuckDB | null = null;
let worker: Worker | null = null;

beforeAll(async () => {
    // Configure the worker
    const DUCKDB_BUNDLES = {
        mvp: {
            mainModule: path.resolve(__dirname, './duckdb.wasm'),
            mainWorker: path.resolve(__dirname, './duckdb-node.worker.cjs'),
        },
        next: {
            mainModule: path.resolve(__dirname, './duckdb-next.wasm'),
            mainWorker: path.resolve(__dirname, './duckdb-node-next.worker.cjs'),
        },
    };
    const DUCKDB_CONFIG = await duckdb.selectBundle(DUCKDB_BUNDLES);

    const logger = new duckdb_blocking.VoidLogger();
    db = await duckdb_blocking.createDuckDB(DUCKDB_BUNDLES, logger, duckdb_blocking.NODE_RUNTIME);
    await db.instantiate();

    worker = new Worker(DUCKDB_CONFIG.mainWorker);
    adb = new duckdb.AsyncDuckDB(logger, worker);
    await adb.instantiate(DUCKDB_CONFIG.mainModule, DUCKDB_CONFIG.pthreadWorker);
});

afterAll(async () => {
    if (worker) worker.terminate();
});

import { testBindings, testAsyncBindings } from './bindings.test';
import { testBatchStream } from './batch_stream.test';
import { testFilesystem } from './filesystem.test';
import { testAsyncBatchStream } from './batch_stream_async.test';
import { testArrowInsert, testArrowInsertAsync } from './insert_arrow.test';
import { testJSONInsert, testJSONInsertAsync } from './insert_json.test';
import { testCSVInsert, testCSVInsertAsync } from './insert_csv.test';
import { testTokenization, testTokenizationAsync } from './tokenizer.test';
import { testRegressionAsync } from './regression';

testRegressionAsync(() => adb!);
testBindings(() => db!, dataDir);
testAsyncBindings(() => adb!, dataDir);
testBatchStream(() => db!);
testAsyncBatchStream(() => adb!);
testFilesystem(() => adb!, resolveData, dataDir);
testArrowInsert(() => db!);
testArrowInsertAsync(() => adb!);
testJSONInsert(() => db!);
testJSONInsertAsync(() => adb!);
testCSVInsert(() => db!);
testCSVInsertAsync(() => adb!);
testTokenization(() => db!);
testTokenizationAsync(() => adb!);
