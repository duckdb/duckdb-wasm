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
import { DuckDBNodeBindings } from '../bindings/bindings_node_common';
import { DuckDBBundles, checkPlatformSupport } from '../platform';
import { DuckDB } from '../bindings/bindings_node_base';

export async function createDuckDB(
    bundles: DuckDBBundles,
    logger: Logger,
    runtime: DuckDBRuntime,
): Promise<DuckDBNodeBindings> {
    await checkPlatformSupport();
    return new DuckDB(logger, runtime, bundles.base.mainModule);
}
