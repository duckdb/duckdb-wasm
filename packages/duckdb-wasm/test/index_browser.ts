import * as duckdb_sync from '../src/targets/duckdb-browser-sync';
import * as duckdb_async from '../src/targets/duckdb-browser-async';
import * as check from 'wasm-feature-detect';

// Configure the worker
const WORKER_BUNDLES = {
    worker: '/static/duckdb-browser-async.worker.js',
    workerEH: '/static/duckdb-browser-async-eh.worker.js',
    workerEHMT: '/static/duckdb-browser-async-eh-mt.worker.js',
    wasm: '/static/duckdb.wasm',
    wasmEH: '/static/duckdb-eh.wasm',
    wasmEHMT: '/static/duckdb-eh-mt.wasm',
};
let WORKER_CONFIG: DuckDBConfig | null = null;

describe('wasm check', () => {
    it('worker and wasm urls', async () => {
        if ((await check.exceptions()) && (await check.threads())) {
            expect(WORKER_CONFIG!.workerURL).toEqual(WORKER_BUNDLES.workerEHMT);
            expect(WORKER_CONFIG!.wasmURL).toEqual(WORKER_BUNDLES.wasmEHMT);
        }
        if ((await check.exceptions()) && !(await check.threads())) {
            expect(WORKER_CONFIG!.workerURL).toEqual(WORKER_BUNDLES.workerEH);
            expect(WORKER_CONFIG!.wasmURL).toEqual(WORKER_BUNDLES.wasmEH);
        }
        if (!(await check.exceptions())) {
            expect(WORKER_CONFIG!.workerURL).toEqual(WORKER_BUNDLES.worker);
            expect(WORKER_CONFIG!.wasmURL).toEqual(WORKER_BUNDLES.wasm);
        }
    });
});

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
    WORKER_CONFIG = await duckdb_async.configure(WORKER_BUNDLES);
    const logger = new duckdb_sync.VoidLogger();
    db = new duckdb_sync.DuckDB(logger, duckdb_sync.BrowserRuntime, '/static/duckdb.wasm');
    await db.open();

    worker = new Worker(WORKER_CONFIG.workerURL);
    adb = new duckdb_async.AsyncDuckDB(logger, worker);
    await adb.open(WORKER_CONFIG.wasmURL.toString());
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
import { testTokenization, testTokenizationAsync } from './tokenizer.test';
import { DuckDBConfig } from '../src/targets/duckdb-browser-async';

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
testTokenization(() => db!);
testTokenizationAsync(() => adb!);
