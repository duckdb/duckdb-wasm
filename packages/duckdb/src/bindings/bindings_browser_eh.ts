import DuckDBWasm from './duckdb_wasm_eh.js';
import { DuckDBBrowserBindings } from './bindings_browser_base';
import { DuckDBModule } from './duckdb_module';
import { DuckDBRuntime } from './runtime_base';
import { Logger } from '../log';

/** DuckDB bindings for the browser */
export class DuckDB extends DuckDBBrowserBindings {
    /** Constructor */
    public constructor(logger: Logger, runtime: DuckDBRuntime, path: string) {
        super(logger, runtime, path);
    }

    /** Instantiate the bindings */
    protected instantiate(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule> {
        return DuckDBWasm({
            ...moduleOverrides,
            instantiateWasm: this.instantiateWasm.bind(this),
        });
    }
}
