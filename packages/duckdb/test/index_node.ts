import * as duckdb_serial from '../src/targets/duckdb-node-serial';
import * as duckdb_parallel from '../src/targets/duckdb-node-parallel';
import path from 'path';
import Worker from 'web-worker';
import fs from 'fs';

// Loading debug symbols, especially for WASM take insanely long so we just disable the test timeout
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

console.assert(duckdb_serial.checkPlatform());

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
let db: duckdb_serial.DuckDB | null = null;
let adb: duckdb_parallel.AsyncDuckDB | null = null;
let worker: Worker | null = null;

beforeAll(async () => {
    const logger = new duckdb_serial.VoidLogger();
    db = new duckdb_serial.DuckDB(logger, duckdb_serial.NodeRuntime, path.resolve(__dirname, './duckdb.wasm'));
    await db.open();

    worker = new Worker(path.resolve(__dirname, './duckdb-node-parallel.worker.js'));
    adb = new duckdb_parallel.AsyncDuckDB(logger, worker);
    await adb.open(path.resolve(__dirname, './duckdb.wasm'));
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

testBindings(() => db!);
testBatchStream(() => db!);
testAsyncBatchStream(() => adb!);
testFilesystem(() => adb!, resolveData);
testZip(() => db!, resolveData);
testZipAsync(() => adb!, resolveData);
testJSONImport(() => db!);
testJSONImportAsync(() => adb!);
