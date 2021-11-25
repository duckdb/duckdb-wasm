import * as check from 'wasm-feature-detect';
import { PACKAGE_NAME, PACKAGE_VERSION } from './version';

export interface DuckDBBundles {
    mvp: {
        mainModule: string;
        mainWorker: string;
    };
    next?: {
        mainModule: string;
        mainWorker: string;
    };
    nextCOI?: {
        mainModule: string;
        mainWorker: string;
        pthreadWorker: string;
    };
}

export function getJsDelivrBundles(): DuckDBBundles {
    const jsdelivr_dist_url = `https://cdn.jsdelivr.net/npm/${PACKAGE_NAME}@${PACKAGE_VERSION}/dist/`;
    return {
        mvp: {
            mainModule: `${jsdelivr_dist_url}duckdb.wasm`,
            mainWorker: `${jsdelivr_dist_url}duckdb-browser.worker.js`,
        },
        next: {
            mainModule: `${jsdelivr_dist_url}duckdb-next.wasm`,
            mainWorker: `${jsdelivr_dist_url}duckdb-browser-next.worker.js`,
        },
        // Next COI is still experimental, let the user opt in explicitly
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
        if (platform.wasmThreads && platform.crossOriginIsolated && bundles.nextCOI) {
            return {
                mainModule: bundles.nextCOI.mainModule,
                mainWorker: bundles.nextCOI.mainWorker,
                pthreadWorker: bundles.nextCOI.pthreadWorker,
            };
        }
        if (bundles.next) {
            return {
                mainModule: bundles.next.mainModule,
                mainWorker: bundles.next.mainWorker,
                pthreadWorker: null,
            };
        }
    }
    return {
        mainModule: bundles.mvp.mainModule,
        mainWorker: bundles.mvp.mainWorker,
        pthreadWorker: null,
    };
}
