import { DuckDBModule } from './duckdb_module';
import { DuckDBNodeBindings } from './bindings_node_base.js';
import { DuckDBRuntime } from './runtime';
import { Logger } from '../log';
/** DuckDB bindings for node.js */
export declare class DuckDB extends DuckDBNodeBindings {
    /** Constructor */
    constructor(logger: Logger, runtime: DuckDBRuntime, mainModulePath: string, pthreadWorkerPath?: string | null);
    /** Instantiate the bindings */
    protected instantiateImpl(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule>;
}
export default DuckDB;
