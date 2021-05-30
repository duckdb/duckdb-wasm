import DuckDBWasm from './duckdb_wasm.js';
import { DuckDBModule } from './duckdb_module';
import { DuckDBBindings } from './bindings';
import { Logger } from '../log';
import fs from 'fs';
import { DuckDBRuntime } from './runtime_base';

declare global {
    // eslint-disable-next-line no-var
    var DuckDBTrampoline: any;
}

/** DuckDB bindings for node.js */
export class DuckDB extends DuckDBBindings {
    /// The path of the wasm module
    protected path: string;

    /// Constructor
    public constructor(logger: Logger, runtime: DuckDBRuntime, path: string) {
        super(logger, runtime);
        this.path = path;
    }

    /// Instantiate the wasm module
    protected instantiateWasm(
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        imports: any,
        success: (module: WebAssembly.Module) => void,
    ): Emscripten.WebAssemblyExports {
        const imports_rt: WebAssembly.Imports = {
            ...imports,
            env: {
                ...imports.env,
            },
        };
        const buf = fs.readFileSync(this.path);
        WebAssembly.instantiate(buf, imports_rt).then(output => {
            const module = output.instance;

            globalThis.DuckDBTrampoline = {};

            for (const func of Object.getOwnPropertyNames(this._runtime)) {
                if (func == 'constructor') continue;
                globalThis.DuckDBTrampoline[func] = Object.getOwnPropertyDescriptor(this._runtime, func)!.value;
            }
            success(module);
        });
        return [];
    }

    /** Instantiate the bindings */
    protected instantiate(moduleOverrides: Partial<DuckDBModule>): Promise<DuckDBModule> {
        return DuckDBWasm({
            ...moduleOverrides,
            instantiateWasm: this.instantiateWasm.bind(this),
        });
    }
}
