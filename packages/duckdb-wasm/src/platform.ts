import * as check from 'wasm-feature-detect';

export interface DuckDBBundles {
    worker: string;
    workerEH?: string;
    workerEHMT?: string;
    wasm: string;
    wasmEH?: string;
    wasmEHMT?: string;
}

export interface DuckDBConfig {
    wasmURL: string;
    workerURL: string;
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

export async function getPlatformFeatures(): Promise<PlatformFeatures> {
    if (wasmExceptions == null) {
        wasmExceptions = await check.exceptions();
    }
    if (wasmThreads == null) {
        wasmThreads = await check.threads();
    }
    return {
        crossOriginIsolated: globalThis.crossOriginIsolated || false,
        wasmExceptions: wasmExceptions!,
        wasmThreads: wasmThreads!,
    };
}

export async function configure(bundles: DuckDBBundles): Promise<DuckDBConfig> {
    const platform = await getPlatformFeatures();
    if (platform.wasmExceptions) {
        if (platform.wasmThreads && bundles.workerEHMT && bundles.wasmEHMT) {
            return {
                workerURL: bundles.workerEHMT,
                wasmURL: bundles.wasmEHMT,
            };
        }
        if (bundles.workerEH && bundles.wasmEH) {
            return {
                workerURL: bundles.workerEH,
                wasmURL: bundles.wasmEH,
            };
        }
    }
    return {
        workerURL: bundles.worker,
        wasmURL: bundles.wasm,
    };
}
