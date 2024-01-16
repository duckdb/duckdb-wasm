/// <reference types="emscripten" />
import { DuckDBModule } from './duckdb_module';
import { DuckDBBindingsBase } from './bindings_base';
import { DuckDBRuntime } from './runtime';
import { Logger } from '../log';
/** DuckDB bindings for the browser */
export declare abstract class DuckDBBrowserBindings extends DuckDBBindingsBase {
    /** The path of the wasm module */
    protected readonly mainModuleURL: string;
    /** The path of the pthread worker script */
    protected readonly pthreadWorkerURL: string | null;
    /** Constructor */
    constructor(logger: Logger, runtime: DuckDBRuntime, mainModuleURL: string, pthreadWorkerURL: string | null);
    /** Locate a file */
    protected locateFile(path: string, prefix: string): string;
    /** Instantiate the wasm module */
    protected instantiateWasm(imports: any, success: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void): Emscripten.WebAssemblyExports;
    protected abstract instantiateImpl(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule>;
}
