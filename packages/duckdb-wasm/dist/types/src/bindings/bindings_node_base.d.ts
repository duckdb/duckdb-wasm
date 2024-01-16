/// <reference types="emscripten" />
import { DuckDBModule } from './duckdb_module';
import { DuckDBBindingsBase } from './bindings_base';
import { DuckDBRuntime } from './runtime';
import { Logger } from '../log';
declare global {
    var DUCKDB_RUNTIME: any;
}
/** DuckDB bindings for node.js */
export declare class DuckDBNodeBindings extends DuckDBBindingsBase {
    /** The path of the wasm module */
    protected readonly mainModulePath: string;
    /** The path of the pthread worker script */
    protected readonly pthreadWorkerPath: string | null;
    /** Constructor */
    constructor(logger: Logger, runtime: DuckDBRuntime, mainModulePath: string, pthreadWorkerPath: string | null);
    /** Locate a file */
    protected locateFile(path: string, prefix: string): string;
    /** Instantiate the wasm module */
    protected instantiateWasm(imports: any, success: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void): Emscripten.WebAssemblyExports;
    /** Instantiate the bindings */
    protected instantiateImpl(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule>;
}
