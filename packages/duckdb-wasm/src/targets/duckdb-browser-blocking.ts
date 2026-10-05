export * from '../bindings';
export * from '../log';
export * from '../platform';
export * from '../status';
export * from '../version';
export { DuckDBDataProtocol } from '../bindings/runtime';
export { DEFAULT_RUNTIME } from '../bindings/runtime';
export { BROWSER_RUNTIME } from '../bindings/runtime_browser';

import { Logger } from '../log';
import { DuckDBRuntime, DuckDBBindings } from '../bindings';
import { DuckDBBundles, checkPlatformSupport } from '../platform';
import { DuckDB } from '../bindings/bindings_browser_base';

export async function createDuckDB(
    bundles: DuckDBBundles,
    logger: Logger,
    runtime: DuckDBRuntime,
): Promise<DuckDBBindings> {
    await checkPlatformSupport();
    return new DuckDB(logger, runtime, bundles.base.mainModule);
}
