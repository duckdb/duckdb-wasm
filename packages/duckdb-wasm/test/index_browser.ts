import * as duckdb_blocking from '../src/targets/duckdb-browser-blocking';
import * as duckdb from '../src/targets/duckdb';
import * as check from 'wasm-feature-detect';

// Configure the worker
const DUCKDB_BUNDLES: duckdb.DuckDBBundles = {
    base: {
        mainModule: new URL('/static/duckdb-base.wasm', window.location.href).href,
        mainWorker: new URL('/static/duckdb-browser-base.worker.js', window.location.href).href,
    },
    threads: {
        mainModule: new URL('/static/duckdb-threads.wasm', window.location.href).href,
        mainWorker: new URL('/static/duckdb-browser-threads.worker.js', window.location.href).href,
        pthreadWorker: new URL('/static/duckdb-browser-threads.pthread.worker.js', window.location.href).href,
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
            expect(DUCKDB_BUNDLE!.mainModule).toEqual(DUCKDB_BUNDLES.threads!.mainModule);
            expect(DUCKDB_BUNDLE!.mainWorker).toEqual(DUCKDB_BUNDLES.threads!.mainWorker);
            expect(DUCKDB_BUNDLE!.pthreadWorker).toEqual(DUCKDB_BUNDLES.threads!.pthreadWorker);
        }
        if ((await check.exceptions()) && !(await check.threads())) {
            expect(DUCKDB_BUNDLE!.mainModule).toEqual(DUCKDB_BUNDLES.base.mainModule);
            expect(DUCKDB_BUNDLE!.mainWorker).toEqual(DUCKDB_BUNDLES.base.mainWorker);
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
        case '/tpch/0_01/parquet/lineitem.parquet':
            return await resolveBuffer('/tpch/0_01/parquet/lineitem.parquet');
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
    await db.instantiate(_ => {});

    DUCKDB_BUNDLE = await duckdb.selectBundle(DUCKDB_BUNDLES);
    worker = await duckdb.createWorker(DUCKDB_BUNDLE!.mainWorker!);
    adb = new duckdb.AsyncDuckDB(logger, worker);
    await adb.instantiate(DUCKDB_BUNDLE!.mainModule, DUCKDB_BUNDLE!.pthreadWorker);
});

afterAll(async () => {
    if (worker) worker.terminate();
});

import { testAllTypes, testAllTypesAsync } from './all_types.test';
import { testHTTPFS, testHTTPFSAsync } from './httpfs_test';
import { testBindings, testAsyncBindings } from './bindings.test';
import { testBatchStream } from './batch_stream.test';
import { testAsyncBatchStream } from './batch_stream_async.test';
import { testFilesystem } from './filesystem.test';
import { testOPFS } from './opfs.test';
import { testArrowInsert, testArrowInsertAsync } from './insert_arrow.test';
import { testJSONInsert, testJSONInsertAsync } from './insert_json.test';
import { testCSVInsert, testCSVInsertAsync } from './insert_csv.test';
import { testTokenization, testTokenizationAsync } from './tokenizer.test';
import { testTableNames, testTableNamesAsync } from './tablenames.test';
import { testRegressionAsync } from './regression';
import { testUDF } from './udf.test';
import { longQueries } from './long_queries.test';
//import { testEXCEL } from './excel.test';
//import { testJSON } from './json.test';
import { testPivot } from './pivot.test';

const baseURL = window.location.origin;
const dataURL = `${baseURL}/data`;

testHTTPFS(() => db!);
testHTTPFSAsync(() => adb!, resolveData, dataURL);
testUDF(() => db!);
longQueries(() => adb!);
testTableNames(() => db!);
testTableNamesAsync(() => adb!);
testRegressionAsync(() => adb!);
testAllTypes(() => db!);
testAllTypesAsync(() => adb!);
testBindings(() => db!, dataURL);
testAsyncBindings(() => adb!, dataURL, duckdb.DuckDBDataProtocol.HTTP);
testBatchStream(() => db!);
testAsyncBatchStream(() => adb!);
testFilesystem(() => adb!, resolveData, dataURL, duckdb.DuckDBDataProtocol.HTTP);
testOPFS(dataURL, () => DUCKDB_BUNDLE!);
testArrowInsert(() => db!);
testArrowInsertAsync(() => adb!);
testJSONInsert(() => db!);
testJSONInsertAsync(() => adb!);
testCSVInsert(() => db!);
testCSVInsertAsync(() => adb!);
testTokenization(() => db!);
testTokenizationAsync(() => adb!);
//testEXCEL(() => db!);
//testJSON(() => db!);
testPivot(() => db!);
