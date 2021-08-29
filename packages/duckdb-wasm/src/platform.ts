import * as check from 'wasm-feature-detect';
import { PACKAGE_NAME, PACKAGE_VERSION } from './version';

export interface DuckDBBundles {
    asyncDefault: {
        mainModule: string;
        mainWorker: string;
    };
    asyncNext?: {
        mainModule: string;
        mainWorker: string;
    };
    asyncNextCOI?: {
        mainModule: string;
        mainWorker: string;
        pthreadWorker: string;
    };
}

function getWorkerURL(url: string) {
    const content = `importScripts("${url}");`;
    return URL.createObjectURL(new Blob([content], { type: 'text/javascript' }));
}

export function getJsDelivrBundles(): DuckDBBundles {
    // XXX This must be changed when we switch to github packages.
    const jsdelivr_dist_url = `https://cdn.jsdelivr.net/npm/${PACKAGE_NAME}@${PACKAGE_VERSION}/dist/`;
    return {
        asyncDefault: {
            mainModule: `${jsdelivr_dist_url}duckdb.wasm`,
            mainWorker: getWorkerURL(`${jsdelivr_dist_url}duckdb-browser-async.worker.js`),
        },
        asyncNext: {
            mainModule: `${jsdelivr_dist_url}duckdb-next.wasm`,
            mainWorker: getWorkerURL(`${jsdelivr_dist_url}duckdb-browser-async-next.worker.js`),
        },
        asyncNextCOI: {
            mainModule: `${jsdelivr_dist_url}duckdb-next-coi.wasm`,
            mainWorker: getWorkerURL(`${jsdelivr_dist_url}duckdb-browser-async-next-coi.worker.js`),
            pthreadWorker: getWorkerURL(`${jsdelivr_dist_url}duckdb-browser-async-next-coi.pthread.worker.js`),
        },
    };
}

export interface DuckDBBundle {
    mainModule: string;
    mainWorker: string | null;
    pthreadWorker: string | null;
}

export interface PlatformFeatures {
    bigInt64Array: boolean;
    crossOriginIsolated: boolean;
    wasmExceptions: boolean;
    wasmSIMD: boolean;
    wasmBulkMemory: boolean;
    wasmThreads: boolean;
}

let bigInt64Array: boolean | null = null;
let wasmExceptions: boolean | null = null;
let wasmThreads: boolean | null = null;
let wasmSIMD: boolean | null = null;
let wasmBulkMemory: boolean | null = null;

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace globalThis {
    let crossOriginIsolated: boolean;
}

function isNode(): boolean {
    return typeof process !== 'undefined' && process.release.name === 'node';
}

export async function getPlatformFeatures(): Promise<PlatformFeatures> {
    if (bigInt64Array == null) {
        bigInt64Array = typeof BigInt64Array != 'undefined';
    }
    if (wasmExceptions == null) {
        wasmExceptions = await check.exceptions();
    }
    if (wasmThreads == null) {
        wasmThreads = await check.threads();
    }
    if (wasmSIMD == null) {
        wasmSIMD = await check.simd();
    }
    if (wasmBulkMemory == null) {
        wasmBulkMemory = await check.bulkMemory();
    }
    return {
        bigInt64Array: bigInt64Array!,
        crossOriginIsolated: isNode() || globalThis.crossOriginIsolated || false,
        wasmExceptions: wasmExceptions!,
        wasmSIMD: wasmSIMD!,
        wasmThreads: wasmThreads!,
        wasmBulkMemory: wasmBulkMemory!,
    };
}

export async function selectBundle(bundles: DuckDBBundles): Promise<DuckDBBundle> {
    const platform = await getPlatformFeatures();
    if (platform.wasmExceptions && platform.wasmSIMD) {
        if (platform.wasmThreads && platform.crossOriginIsolated && bundles.asyncNextCOI) {
            return {
                mainModule: bundles.asyncNextCOI.mainModule,
                mainWorker: bundles.asyncNextCOI.mainWorker,
                pthreadWorker: bundles.asyncNextCOI.pthreadWorker,
            };
        }
        if (bundles.asyncNext) {
            return {
                mainModule: bundles.asyncNext.mainModule,
                mainWorker: bundles.asyncNext.mainWorker,
                pthreadWorker: null,
            };
        }
    }
    return {
        mainModule: bundles.asyncDefault.mainModule,
        mainWorker: bundles.asyncDefault.mainWorker,
        pthreadWorker: null,
    };
}
