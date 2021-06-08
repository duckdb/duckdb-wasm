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

export async function configure(bundles: DuckDBBundles): Promise<DuckDBConfig> {
    if (await check.exceptions()) {
        if ((await check.threads()) && bundles.workerEHMT && bundles.wasmEHMT) {
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
