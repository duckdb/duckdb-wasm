import DuckDBWasm from './duckdb_wasm.js';
import { DuckDBModule } from './duckdb_module';
import { DuckDBBindings } from './bindings';
import { DuckDBRuntime } from './runtime_base';
import { Logger } from '../log';

declare global {
    // eslint-disable-next-line no-var
    var DuckDBTrampoline: any;
}

/** DuckDB bindings for the browser */
export class DuckDBBrowserBindings extends DuckDBBindings {
    /** The path of the wasm module */
    protected path: string;

    /** Constructor */
    public constructor(logger: Logger, runtime: DuckDBRuntime, path: string) {
        super(logger, runtime);
        this.path = path;
    }

    /** Instantiate the wasm module */
    protected instantiateWasm(
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        imports: any,
        success: (module: WebAssembly.Module) => void,
    ): Emscripten.WebAssemblyExports {
        const imports_rt: WebAssembly.Imports = {
            ...imports,
            env: {
                ...imports.env,
                ...this._runtime,
            },
        };
        if (WebAssembly.instantiateStreaming) {
            WebAssembly.instantiateStreaming(fetch(this.path), imports_rt).then(output => {
                globalThis.DuckDBTrampoline = {};

                for (const func of Object.getOwnPropertyNames(this._runtime)) {
                    if (func == 'constructor') continue;
                    globalThis.DuckDBTrampoline[func] = Object.getOwnPropertyDescriptor(this._runtime, func)!.value;
                }
                success(output.instance);
            });
        } else {
            fetch(this.path)
                .then(resp => resp.arrayBuffer())
                .then(bytes =>
                    WebAssembly.instantiate(bytes, imports_rt).then(output => {
                        globalThis.DuckDBTrampoline = {};

                        for (const func of Object.getOwnPropertyNames(this._runtime)) {
                            if (func == 'constructor') continue;
                            globalThis.DuckDBTrampoline[func] = Object.getOwnPropertyDescriptor(
                                this._runtime,
                                func,
                            )!.value;
                        }
                        success(output.instance);
                    }),
                )
                .catch(error => {
                    console.error('Failed to instantiate WASM:', error);
                });
        }
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
