export * from '../log';
export * from '../status';
export * from '../bindings';
export * from '../bindings/bindings_node_next';
export { DEFAULT_RUNTIME } from '../bindings/runtime';
export { NODE_RUNTIME } from '../bindings/runtime_node';

import { Logger } from '../log';
import { DuckDBRuntime } from '../bindings';
import { DuckDBNodeBindings } from '../bindings/bindings_node_base';
import { DuckDBBundles, getPlatformFeatures } from '../platform';
import { DuckDB as DuckDBMVP } from '../bindings/bindings_node';
import { DuckDB as DuckDBNext } from '../bindings/bindings_node_next';

export async function createDuckDB(
    bundles: DuckDBBundles,
    logger: Logger,
    runtime: DuckDBRuntime,
): Promise<DuckDBNodeBindings> {
    const platform = await getPlatformFeatures();
    if (platform.wasmExceptions && platform.wasmSIMD) {
        if (bundles.asyncNext) {
            return new DuckDBNext(logger, runtime, bundles.asyncNext!.mainModule);
        }
    }
    return new DuckDBMVP(logger, runtime, bundles.asyncDefault.mainModule);
}
