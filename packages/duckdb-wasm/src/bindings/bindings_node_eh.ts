import DuckDBWasm from './duckdb-eh.js';
import { DuckDBModule } from './duckdb_module';
import { DuckDBNodeBindings } from './bindings_node_base.js';
import { DuckDBRuntime } from './runtime';
import { Logger } from '../log';

/** DuckDB bindings for node.js */
export class DuckDB extends DuckDBNodeBindings {
    /** Constructor */
    public constructor(
        logger: Logger,
        runtime: DuckDBRuntime,
        mainModule: string | WebAssembly.Module,
        pthreadWorkerPath: string | null = null,
    ) {
        super(logger, runtime, mainModule, pthreadWorkerPath);
    }

    /** Instantiate the bindings */
    protected instantiateImpl(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule> {
        return DuckDBWasm({
            ...moduleOverrides,
            instantiateWasm: this.instantiateWasm.bind(this),
            locateFile: this.locateFile.bind(this),
        });
    }
}

export default DuckDB;
