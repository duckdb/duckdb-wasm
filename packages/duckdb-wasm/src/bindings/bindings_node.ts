import DuckDBWasm from './duckdb_wasm.js';
import { DuckDBNodeBindings } from './bindings_node_base.js';
import { Logger } from '../log.js';
import { DuckDBModule } from './duckdb_module';
import { DuckDBRuntime } from './runtime_base';

/** DuckDB bindings for node.js */
export class DuckDB extends DuckDBNodeBindings {
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
