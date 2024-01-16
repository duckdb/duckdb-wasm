import { DuckDBBrowserBindings } from './bindings_browser_base';
import { DuckDBModule } from './duckdb_module';
import { DuckDBRuntime } from './runtime';
import { Logger } from '../log';
/** DuckDB bindings for the browser */
export declare class DuckDB extends DuckDBBrowserBindings {
    /** Constructor */
    constructor(logger: Logger, runtime: DuckDBRuntime, mainModuleURL: string, pthreadWorkerURL?: string | null);
    /** Instantiate the bindings */
    protected instantiateImpl(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule>;
}
