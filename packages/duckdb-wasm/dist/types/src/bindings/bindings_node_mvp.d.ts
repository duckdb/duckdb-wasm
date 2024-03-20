import { DuckDBNodeBindings } from './bindings_node_base.js';
import { Logger } from '../log.js';
import { DuckDBModule } from './duckdb_module';
import { DuckDBRuntime } from './runtime';
/** DuckDB bindings for node.js */
export declare class DuckDB extends DuckDBNodeBindings {
    /** Constructor */
    constructor(logger: Logger, runtime: DuckDBRuntime, mainModulePath: string, pthreadWorkerPath?: string | null);
    /** Instantiate the bindings */
    protected instantiateImpl(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule>;
}
export default DuckDB;
