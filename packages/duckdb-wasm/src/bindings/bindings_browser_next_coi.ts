import DuckDBWasm from './duckdb_wasm_next_coi.js';
import { getPThread } from './duckdb_wasm_next_coi.js';
import { DuckDBBrowserBindings } from './bindings_browser_base';
import { DuckDBModule } from './duckdb_module';
import { DuckDBRuntime } from './runtime';
import { Logger } from '../log';

/** DuckDB bindings for the browser */
export class DuckDB extends DuckDBBrowserBindings {
    /** Constructor */
    public constructor(
        logger: Logger,
        runtime: DuckDBRuntime,
        mainModuleURL: string,
        pthreadWorkerURL: string | null = null,
    ) {
        super(logger, runtime, mainModuleURL, pthreadWorkerURL);
    }

    /** Instantiate the bindings */
    protected instantiate(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule> {
        this._pthread = getPThread();
        return DuckDBWasm({
            ...moduleOverrides,
            instantiateWasm: this.instantiateWasm.bind(this),
            locateFile: this.locateFile.bind(this),
        });
    }
}

export default DuckDB;
