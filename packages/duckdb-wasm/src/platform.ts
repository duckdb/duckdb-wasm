import * as check from 'wasm-feature-detect';
import { PACKAGE_NAME, PACKAGE_VERSION } from './version';

// Platform check taken from here:
// https://github.com/xtermjs/xterm.js/blob/master/src/common/Platform.ts#L21

interface INavigator {
    userAgent: string;
    language: string;
    platform: string;
}

// We're declaring a navigator global here as we expect it in all runtimes (node and browser), but
// we want this module to live in common.
declare const navigator: INavigator;

export const isNode = () => (typeof navigator === 'undefined' ? true : false);
const userAgent = () => (isNode() ? 'node' : navigator.userAgent);
export const isFirefox = () => userAgent().includes('Firefox');
export const isSafari = () => /^((?!chrome|android).)*safari/i.test(userAgent());

/** Bundles have different characteristics:
 * - base: single-threaded, requires WebAssembly exception handling
 * - threads: multi-threaded, additionally requires SIMD, threads and cross origin isolation
 */
export interface DuckDBBundles {
    base: {
        mainModule: string;
        mainWorker: string;
    };
    threads?: {
        mainModule: string;
        mainWorker: string;
        pthreadWorker: string;
    };
}

export function getJsDelivrBundles(): DuckDBBundles {
    const jsdelivr_dist_url = `https://cdn.jsdelivr.net/npm/${PACKAGE_NAME}@${PACKAGE_VERSION}/dist/`;
    return {
        base: {
            mainModule: `${jsdelivr_dist_url}duckdb-base.wasm`,
            mainWorker: `${jsdelivr_dist_url}duckdb-browser-base.worker.js`,
        },
        // threads is still experimental, let the user opt in explicitly
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

/** Every bundle requires WebAssembly exception handling, throws if the platform does not support it */
export async function checkPlatformSupport(): Promise<PlatformFeatures> {
    const platform = await getPlatformFeatures();
    if (!platform.wasmExceptions) {
        throw new Error('DuckDB-Wasm requires WebAssembly exception handling, which this platform does not support');
    }
    return platform;
}

export async function selectBundle(bundles: DuckDBBundles): Promise<DuckDBBundle> {
    const platform = await checkPlatformSupport();
    if (platform.wasmSIMD && platform.wasmThreads && platform.crossOriginIsolated && bundles.threads) {
        return {
            mainModule: bundles.threads.mainModule,
            mainWorker: bundles.threads.mainWorker,
            pthreadWorker: bundles.threads.pthreadWorker,
        };
    }
    return {
        mainModule: bundles.base.mainModule,
        mainWorker: bundles.base.mainWorker,
        pthreadWorker: null,
    };
}
