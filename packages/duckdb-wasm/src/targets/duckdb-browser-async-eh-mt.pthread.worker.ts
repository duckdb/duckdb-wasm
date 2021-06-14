import * as pthread_api from '../bindings/duckdb_wasm_eh_mt.pthread';
import DuckDB from '../bindings/duckdb_wasm_eh_mt';
import Runtime from '../bindings/runtime_browser';

// Register the global DuckDB runtime
globalThis.DuckDBTrampoline = {};
for (const func of Object.getOwnPropertyNames(Runtime)) {
    if (func == 'constructor') continue;
    globalThis.DuckDBTrampoline[func] = Object.getOwnPropertyDescriptor(Runtime, func)!.value;
}

// We just override the load handler of the pthread wrapper to bundle DuckDB with esbuild.
globalThis.onmessage = (e: any) => {
    if (e.data.cmd === 'load') {
        const m = pthread_api.getModule();

        // Module and memory were sent from main thread
        m['wasmModule'] = e.data.wasmModule;
        m['wasmMemory'] = e.data.wasmMemory;
        m['buffer'] = m['wasmMemory'].buffer;
        m['ENVIRONMENT_IS_PTHREAD'] = true;

        DuckDB(m).then(function (instance) {
            pthread_api.setModule(instance);
        });
    } else {
        pthread_api.onmessage(e);
    }
};
