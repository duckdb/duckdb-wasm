import * as pthread_api from '../bindings/duckdb-coi.pthread';
import DuckDB from '../bindings/duckdb-coi';
import { BROWSER_RUNTIME } from '../bindings/runtime_browser';

// Register the global DuckDB runtime
globalThis.DUCKDB_RUNTIME = {};
for (const func of Object.getOwnPropertyNames(BROWSER_RUNTIME)) {
    if (func == 'constructor') continue;
    globalThis.DUCKDB_RUNTIME[func] = Object.getOwnPropertyDescriptor(BROWSER_RUNTIME, func)!.value;
}

// We just override the load handler of the pthread wrapper to bundle DuckDB with esbuild.
globalThis.onmessage = (e: any) => {
    if (e.data.cmd === 'load') {
        let m = pthread_api.getModule();

        (globalThis as any).startWorker = (instance: any) => {
            m = instance;
            postMessage({ cmd: 'loaded' });
        };
        m['wasmModule'] = e.data.wasmModule;
        m['wasmMemory'] = e.data.wasmMemory;
        m['buffer'] = m['wasmMemory'].buffer;
        m['ENVIRONMENT_IS_PTHREAD'] = true;
        DuckDB(m).then((instance: any) => {
            pthread_api.setModule(instance);
        });
    } else if (e.data.cmd === 'registerFileHandle') {
        globalThis.DUCKDB_RUNTIME._files = globalThis.DUCKDB_RUNTIME._files || new Map();
        globalThis.DUCKDB_RUNTIME._files.set(e.data.fileName, e.data.fileHandle);
    } else if (e.data.cmd === 'dropFileHandle') {
        globalThis.DUCKDB_RUNTIME._files = globalThis.DUCKDB_RUNTIME._files || new Map();
        globalThis.DUCKDB_RUNTIME._files.delete(e.data.fileName);
    } else if (e.data.cmd === 'registerUDFFunction') {
        globalThis.DUCKDB_RUNTIME._udfFunctions = globalThis.DUCKDB_RUNTIME._files || new Map();
        globalThis.DUCKDB_RUNTIME._udfFunctions.set(e.data.udf.name, e.data.udf);
    } else if (e.data.cmd === 'dropUDFFunctions') {
        globalThis.DUCKDB_RUNTIME._udfFunctions = globalThis.DUCKDB_RUNTIME._files || new Map();
        for (const key of globalThis.DUCKDB_RUNTIME._udfFunctions.keys()) {
            if (globalThis.DUCKDB_RUNTIME._udfFunctions.get(key).connection_id == e.data.connectionId) {
                globalThis.DUCKDB_RUNTIME._udfFunctions.delete(key);
            }
        }
    } else {
        pthread_api.onmessage(e);
    }
};
