import * as check from 'wasm-check';

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

export function configure(bundles: DuckDBBundles): DuckDBConfig {
    if (check.feature.exceptions) {
        if (check.feature.threads && bundles.workerEHMT && bundles.wasmEHMT) {
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
