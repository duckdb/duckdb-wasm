import DuckDBWasm from './duckdb_wasm_eh.js';
import { DuckDBModule } from './duckdb_module';
import { DuckDBNodeBindings } from './bindings_node_base.js';
import { DuckDBRuntime } from './runtime_base';
import { Logger } from '../log';

declare global {
    // eslint-disable-next-line no-var
    var DuckDBTrampoline: any;
}

/** DuckDB bindings for node.js */
export class DuckDB extends DuckDBNodeBindings {
    /** Constructor */
    public constructor(
        logger: Logger,
        runtime: DuckDBRuntime,
        mainModulePath: string,
        pthreadWorkerPath: string | null = null,
    ) {
        super(logger, runtime, mainModulePath, pthreadWorkerPath);
    }

    /** Instantiate the bindings */
    protected instantiate(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule> {
        return DuckDBWasm({
            ...moduleOverrides,
            instantiateWasm: this.instantiateWasm.bind(this),
            locateFile: this.locateFile.bind(this),
        });
    }
}

export default DuckDB;
