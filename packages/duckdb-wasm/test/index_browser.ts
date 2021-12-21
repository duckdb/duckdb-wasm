import * as duckdb_blocking from '../src/targets/duckdb-browser-blocking';
import * as duckdb from '../src/targets/duckdb';
import * as check from 'wasm-feature-detect';

// Configure the worker
const DUCKDB_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
        mainModule: new URL('/static/duckdb.wasm', window.location.href).href,
        mainWorker: new URL('/static/duckdb-browser.worker.js', window.location.href).href,
    },
    next: {
        mainModule: new URL('/static/duckdb-next.wasm', window.location.href).href,
        mainWorker: new URL('/static/duckdb-browser-next.worker.js', window.location.href).href,
    },
    nextCOI: {
        mainModule: new URL('/static/duckdb-next-coi.wasm', window.location.href).href,
        mainWorker: new URL('/static/duckdb-browser-next-coi.worker.js', window.location.href).href,
        pthreadWorker: new URL('/static/duckdb-browser-next-coi.pthread.worker.js', window.location.href).href,
    },
};
let DUCKDB_BUNDLE: duckdb.DuckDBBundle | null = null;

describe('wasm check', () => {
    it('worker and wasm urls', async () => {
        if (
            (await duckdb.getPlatformFeatures()).crossOriginIsolated &&
            (await check.exceptions()) &&
            (await check.threads())
        ) {
            expect(DUCKDB_BUNDLE!.mainModule).toEqual(DUCKDB_BUNDLES.nextCOI!.mainModule);
            expect(DUCKDB_BUNDLE!.mainWorker).toEqual(DUCKDB_BUNDLES.nextCOI!.mainWorker);
            expect(DUCKDB_BUNDLE!.pthreadWorker).toEqual(DUCKDB_BUNDLES.nextCOI!.pthreadWorker);
        }
        if ((await check.exceptions()) && !(await check.threads())) {
            expect(DUCKDB_BUNDLE!.mainModule).toEqual(DUCKDB_BUNDLES.next!.mainModule);
            expect(DUCKDB_BUNDLE!.mainWorker).toEqual(DUCKDB_BUNDLES.next!.mainWorker);
            expect(DUCKDB_BUNDLE!.pthreadWorker).toEqual(null);
        }
        if (!(await check.exceptions())) {
            expect(DUCKDB_BUNDLE!.mainModule).toEqual(DUCKDB_BUNDLES.mvp!.mainModule);
            expect(DUCKDB_BUNDLE!.mainWorker).toEqual(DUCKDB_BUNDLES.mvp!.mainWorker);
            expect(DUCKDB_BUNDLE!.pthreadWorker).toEqual(null);
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
let db: duckdb_blocking.DuckDBBindings | null = null;
let adb: duckdb.AsyncDuckDB | null = null;
let worker: Worker | null = null;

beforeAll(async () => {
    const logger = new duckdb_blocking.VoidLogger();
    db = await duckdb_blocking.createDuckDB(DUCKDB_BUNDLES, logger, duckdb_blocking.BROWSER_RUNTIME);
    await db.instantiate();

    DUCKDB_BUNDLE = await duckdb.selectBundle(DUCKDB_BUNDLES);
    worker = await duckdb.createWorker(DUCKDB_BUNDLE!.mainWorker!);
    adb = new duckdb.AsyncDuckDB(logger, worker);
    await adb.instantiate(DUCKDB_BUNDLE!.mainModule, DUCKDB_BUNDLE!.pthreadWorker);
});

afterAll(async () => {
    if (worker) worker.terminate();
});

import { testAllTypes, testAllTypesAsync } from './all_types.test';
import { testBindings, testAsyncBindings } from './bindings.test';
import { testBatchStream } from './batch_stream.test';
import { testAsyncBatchStream } from './batch_stream_async.test';
import { testFilesystem } from './filesystem.test';
import { testArrowInsert, testArrowInsertAsync } from './insert_arrow.test';
import { testJSONInsert, testJSONInsertAsync } from './insert_json.test';
import { testCSVInsert, testCSVInsertAsync } from './insert_csv.test';
import { testTokenization, testTokenizationAsync } from './tokenizer.test';
import { testTableNames, testTableNamesAsync } from './tablenames.test';
import { testRegressionAsync } from './regression';

const baseURL = window.location.origin;
const dataURL = `${baseURL}/data`;

testTableNames(() => db!);
testTableNamesAsync(() => adb!);
testRegressionAsync(() => adb!);
testAllTypes(() => db!);
testAllTypesAsync(() => adb!);
testBindings(() => db!, dataURL);
testAsyncBindings(() => adb!, dataURL);
testBatchStream(() => db!);
testAsyncBatchStream(() => adb!);
testFilesystem(() => adb!, resolveData, dataURL);
testArrowInsert(() => db!);
testArrowInsertAsync(() => adb!);
testJSONInsert(() => db!);
testJSONInsertAsync(() => adb!);
testCSVInsert(() => db!);
testCSVInsertAsync(() => adb!);
testTokenization(() => db!);
testTokenizationAsync(() => adb!);
