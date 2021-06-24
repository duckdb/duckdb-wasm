import * as check from 'wasm-feature-detect';

export interface DuckDBBundles {
    asyncDefault: {
        mainModule: string;
        mainWorker: string;
    };
    asyncEH?: {
        mainModule: string;
        mainWorker: string;
    };
    asyncEHMT?: {
        mainModule: string;
        mainWorker: string;
        pthreadWorker: string;
    };
}

export interface DuckDBConfig {
    mainModule: string;
    mainWorker: string | null;
    pthreadWorker: string | null;
}

export interface PlatformFeatures {
    crossOriginIsolated: boolean;
    wasmExceptions: boolean;
    wasmThreads: boolean;
}

let wasmExceptions: boolean | null = null;
let wasmThreads: boolean | null = null;

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace globalThis {
    let crossOriginIsolated: boolean;
}

function isNode(): boolean {
    return typeof process !== 'undefined' && process.release.name === 'node';
}

export async function getPlatformFeatures(): Promise<PlatformFeatures> {
    if (wasmExceptions == null) {
        wasmExceptions = await check.exceptions();
    }
    if (wasmThreads == null) {
        wasmThreads = await check.threads();
    }
    return {
        crossOriginIsolated: isNode() || globalThis.crossOriginIsolated || false,
        wasmExceptions: wasmExceptions!,
        wasmThreads: wasmThreads!,
    };
}

export async function configure(bundles: DuckDBBundles): Promise<DuckDBConfig> {
    const platform = await getPlatformFeatures();
    if (platform.wasmExceptions) {
        if (platform.wasmThreads && platform.crossOriginIsolated && bundles.asyncEHMT) {
            return {
                mainModule: bundles.asyncEHMT.mainModule,
                mainWorker: bundles.asyncEHMT.mainWorker,
                pthreadWorker: bundles.asyncEHMT.pthreadWorker,
            };
        }
        if (bundles.asyncEH) {
            return {
                mainModule: bundles.asyncEH.mainModule,
                mainWorker: bundles.asyncEH.mainWorker,
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
