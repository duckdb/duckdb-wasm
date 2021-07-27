import * as duckdb_sync from '../src/targets/duckdb-browser-sync';
import * as duckdb_async from '../src/targets/duckdb-browser-async';
import * as check from 'wasm-feature-detect';

// Configure the worker
const DUCKDB_BUNDLES: duckdb_async.DuckDBBundles = {
    asyncDefault: {
        mainModule: '/static/duckdb.wasm',
        mainWorker: '/static/duckdb-browser-async.worker.js',
    },
    asyncNext: {
        mainModule: '/static/duckdb-next.wasm',
        mainWorker: '/static/duckdb-browser-async-next.worker.js',
    },
    asyncNextCOI: {
        mainModule: '/static/duckdb-next-coi.wasm',
        mainWorker: '/static/duckdb-browser-async-next-coi.worker.js',
        pthreadWorker: '/static/duckdb-browser-async-next-coi.pthread.worker.js',
    },
};
let DUCKDB_CONFIG: DuckDBConfig | null = null;

describe('wasm check', () => {
    it('worker and wasm urls', async () => {
        if (
            (await getPlatformFeatures()).crossOriginIsolated &&
            (await check.exceptions()) &&
            (await check.threads())
        ) {
            expect(DUCKDB_CONFIG!.mainModule).toEqual(DUCKDB_BUNDLES.asyncNextCOI!.mainModule);
            expect(DUCKDB_CONFIG!.mainWorker).toEqual(DUCKDB_BUNDLES.asyncNextCOI!.mainWorker);
            expect(DUCKDB_CONFIG!.pthreadWorker).toEqual(DUCKDB_BUNDLES.asyncNextCOI!.pthreadWorker);
        }
        if ((await check.exceptions()) && !(await check.threads())) {
            expect(DUCKDB_CONFIG!.mainModule).toEqual(DUCKDB_BUNDLES.asyncNext!.mainModule);
            expect(DUCKDB_CONFIG!.mainWorker).toEqual(DUCKDB_BUNDLES.asyncNext!.mainWorker);
            expect(DUCKDB_CONFIG!.pthreadWorker).toEqual(null);
        }
        if (!(await check.exceptions())) {
            expect(DUCKDB_CONFIG!.mainModule).toEqual(DUCKDB_BUNDLES.asyncDefault!.mainModule);
            expect(DUCKDB_CONFIG!.mainWorker).toEqual(DUCKDB_BUNDLES.asyncDefault!.mainWorker);
            expect(DUCKDB_CONFIG!.pthreadWorker).toEqual(null);
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
    DUCKDB_CONFIG = await duckdb_async.configure(DUCKDB_BUNDLES);
    const logger = new duckdb_sync.VoidLogger();
    db = new duckdb_sync.DuckDB(logger, duckdb_sync.BROWSER_RUNTIME, '/static/duckdb.wasm');
    await db.instantiate();

    worker = new Worker(DUCKDB_CONFIG.mainWorker!);
    adb = new duckdb_async.AsyncDuckDB(logger, worker);
    await adb.instantiate(DUCKDB_CONFIG.mainModule, DUCKDB_CONFIG.pthreadWorker);
});

afterAll(async () => {
    if (worker) worker.terminate();
});

import { testBindings, testAsyncBindings } from './bindings.test';
import { testBatchStream } from './batch_stream.test';
import { testAsyncBatchStream } from './batch_stream_async.test';
import { testFilesystem } from './filesystem.test';
import { testZip, testZipAsync } from './zip.test';
import { testJSONImport, testJSONImportAsync } from './import_json.test';
import { testCSVImport, testCSVImportAsync } from './import_csv.test';
import { testTokenization, testTokenizationAsync } from './tokenizer.test';
import { DuckDBConfig, getPlatformFeatures } from '../src/targets/duckdb-browser-async';

const baseURL = window.location.origin;
const dataURL = `${baseURL}/data`;

testBindings(() => db!, dataURL);
testAsyncBindings(() => adb!, dataURL);
testBatchStream(() => db!);
testAsyncBatchStream(() => adb!);
testFilesystem(() => adb!, resolveData, dataURL);
testZip(() => db!, resolveData);
testZipAsync(() => adb!, resolveData);
testJSONImport(() => db!);
testJSONImportAsync(() => adb!);
testCSVImport(() => db!);
testCSVImportAsync(() => adb!);
testTokenization(() => db!);
testTokenizationAsync(() => adb!);
