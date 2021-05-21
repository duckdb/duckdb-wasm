import * as duckdb_serial from '../src/targets/duckdb-browser-serial';
import * as duckdb_parallel from '../src/targets/duckdb-browser-parallel';

// Loading debug symbols, especially for WASM take insanely long so we just disable the test timeout
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

// Resolve a buffer by fetching from disk
const resolveBuffer = async (url: string) => {
    const req = await fetch(`/data${url}`);
    if (!req.ok) return null;
    return new Uint8Array(await req.arrayBuffer());
};

// Resolve test data
const resolveData = async (url: string) => {
    switch (url) {
        case '/uni/all.zip':
            return await resolveBuffer('/uni/out/all.zip');
        case '/uni/assistenten.parquet':
            return await resolveBuffer('/uni/out/assistenten.parquet');
        case '/uni/studenten.parquet':
            return await resolveBuffer('/uni/out/studenten.parquet');
        case '/uni/hoeren.parquet':
            return await resolveBuffer('/uni/out/hoeren.parquet');
        case '/uni/vorlesungen.parquet':
            return await resolveBuffer('/uni/out/vorlesungen.parquet');
        case '/tpch/5/orders.parquet':
            return await resolveBuffer('/tpch/5/orders.parquet');
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
    db = new duckdb_serial.DuckDB(logger, duckdb_serial.BrowserRuntime, '/static/duckdb.wasm');
    await db.open();

    worker = new Worker('/static/duckdb-browser-parallel.worker.js');
    adb = new duckdb_parallel.AsyncDuckDB(logger, worker);
    await adb.open('/static/duckdb.wasm');
});

afterAll(async () => {
    if (worker) worker.terminate();
});

import { testBindings } from './bindings.test';
import { testBatchStream } from './batch_stream.test';
import { testAsyncBatchStream } from './batch_stream_async.test';
import { testFilesystem } from './filesystem.test';
import { testZip, testZipAsync } from './zip.test';
import { testJSONImport, testJSONImportAsync } from './import_json.test';
import { testCSVImport, testCSVImportAsync } from './import_csv.test';

testBindings(() => db!);
testBatchStream(() => db!);
testAsyncBatchStream(() => adb!);
testFilesystem(() => adb!, resolveData);
testZip(() => db!, resolveData);
testZipAsync(() => adb!, resolveData);
testJSONImport(() => db!);
testJSONImportAsync(() => adb!);
testCSVImport(() => db!);
testCSVImportAsync(() => adb!);
