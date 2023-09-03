export * from '../bindings';
export * from '../log';
export * from '../platform';
export * from '../status';
export * from '../version';
export { DuckDBDataProtocol } from '../bindings/runtime';
export { DEFAULT_RUNTIME } from '../bindings/runtime';
export { NODE_RUNTIME } from '../bindings/runtime_node';

import { Logger } from '../log';
import { DuckDBRuntime } from '../bindings';
import { DuckDBNodeBindings } from '../bindings/bindings_node_base';
import { DuckDBBundles, getPlatformFeatures } from '../platform';
import { DuckDB as DuckDBMVP } from '../bindings/bindings_node_mvp';
/// #if EH_BUILD_ENABLED
import { DuckDB as DuckDBNext } from '../bindings/bindings_node_eh';
/// #endif

export async function createDuckDB(
    bundles: DuckDBBundles,
    logger: Logger,
    runtime: DuckDBRuntime,
): Promise<DuckDBNodeBindings> {
    const platform = await getPlatformFeatures();
    /// #if EH_BUILD_ENABLED
    if (platform.wasmExceptions) {
        if (bundles.eh) {
            return new DuckDBNext(logger, runtime, bundles.eh!.mainModule);
        }
    }
    /// #endif
    return new DuckDBMVP(logger, runtime, bundles.mvp.mainModule);
}
