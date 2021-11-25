export * from '../bindings';
export * from '../log';
export * from '../status';
export * from '../platform';
export { DEFAULT_RUNTIME } from '../bindings/runtime';
export { BROWSER_RUNTIME } from '../bindings/runtime_browser';

import { Logger } from '../log';
import { DuckDBRuntime, DuckDBBindings } from '../bindings';
import { DuckDBBundles, getPlatformFeatures } from '../platform';
import { DuckDB as DuckDBMVP } from '../bindings/bindings_browser';
import { DuckDB as DuckDBNext } from '../bindings/bindings_browser_next';

export async function createDuckDB(
    bundles: DuckDBBundles,
    logger: Logger,
    runtime: DuckDBRuntime,
): Promise<DuckDBBindings> {
    const platform = await getPlatformFeatures();
    if (platform.wasmExceptions && platform.wasmSIMD) {
        if (bundles.next) {
            return new DuckDBNext(logger, runtime, bundles.next!.mainModule);
        }
    }
    return new DuckDBMVP(logger, runtime, bundles.mvp.mainModule);
}
