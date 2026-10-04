import DuckDBWasm from './duckdb-mvp.js';
import { DuckDBModule } from './duckdb_module';
import { DuckDBBindingsBase } from './bindings_base';
import { DuckDBRuntime } from './runtime';
import { Logger } from '../log';
import fs from 'fs';

declare global {
    // eslint-disable-next-line no-var
    var DUCKDB_RUNTIME: any;
}

/** DuckDB bindings for node.js */
export class DuckDBNodeBindings extends DuckDBBindingsBase {
    /** The path or module of the wasm module */
    protected readonly mainModule: string | WebAssembly.Module;
    /** The path of the pthread worker script */
    protected readonly pthreadWorkerPath: string | null;

    /** Constructor */
    public constructor(
        logger: Logger,
        runtime: DuckDBRuntime,
        mainModule: string | WebAssembly.Module,
        pthreadWorkerPath: string | null,
    ) {
        super(logger, runtime);
        this.mainModule = mainModule;
        this.pthreadWorkerPath = pthreadWorkerPath;
    }

    /** Locate a file */
    protected locateFile(path: string, prefix: string): string {
        if (path.endsWith('.wasm')) {
            if (typeof this.mainModule === 'string') {
                return this.mainModule;
            }
            return ''; // Should not be needed if we override instantiateWasm
        }
        if (path.endsWith('.worker.js')) {
            if (!this.pthreadWorkerPath) {
                throw new Error('Missing DuckDB worker path!');
            }
            return this.pthreadWorkerPath!;
        }
        throw new Error(`WASM instantiation requested unexpected file: prefix=${prefix} path=${path}`);
    }

    /** Instantiate the wasm module */
    protected instantiateWasm(
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        imports: any,
        success: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void,
    ): Emscripten.WebAssemblyExports {
        globalThis.DUCKDB_RUNTIME = {};
        for (const func of Object.getOwnPropertyNames(this._runtime)) {
            if (func == 'constructor') continue;
            globalThis.DUCKDB_RUNTIME[func] = Object.getOwnPropertyDescriptor(this._runtime, func)!.value;
        }
        if (typeof this.mainModule === 'string') {
            const buf = fs.readFileSync(this.mainModule);
            WebAssembly.instantiate(buf, imports).then(output => {
                success(output.instance, output.module);
            });
        } else {
            WebAssembly.instantiate(this.mainModule, imports).then(instance => {
                success(instance, this.mainModule as WebAssembly.Module);
            });
        }
        return [];
    }

    /** Instantiate the bindings */
    protected instantiateImpl(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule> {
        return DuckDBWasm({
            ...moduleOverrides,
            instantiateWasm: this.instantiateWasm.bind(this),
        });
    }
}
