import { AsyncDuckDBDispatcher, WorkerResponseVariant, WorkerRequestVariant } from '../parallel';
import { DuckDB } from '../bindings/bindings_browser_threads';
import DuckDBWasm from '../bindings/duckdb-threads.js';
import { DuckDBBindings } from '../bindings';
import { BROWSER_RUNTIME } from '../bindings/runtime_browser';
import { InstantiationProgress } from '../bindings/progress';

/** The duckdb worker API for web workers */
class WebWorker extends AsyncDuckDBDispatcher {
    /** Post a response back to the main thread */
    protected postMessage(response: WorkerResponseVariant, transfer: ArrayBuffer[]) {
        globalThis.postMessage(response, transfer);
    }

    /** Instantiate the wasm module */
    protected async instantiate(
        mainModuleURL: string,
        pthreadWorkerURL: string | null,
        progress: (p: InstantiationProgress) => void,
    ): Promise<DuckDBBindings> {
        const bindings = new DuckDB(this, BROWSER_RUNTIME, mainModuleURL, pthreadWorkerURL);
        return await bindings.instantiate(progress);
    }
}

/** Register the worker */
export function registerWorker(): void {
    const api = new WebWorker();
    globalThis.onmessage = async (event: MessageEvent<WorkerRequestVariant>) => {
        await api.onMessage(event.data);
    };
}

/** Run as a pthread: emscripten spawns the pthreads from the script of the main worker, named em-pthread. The
 * module factory recognizes the environment and takes over the messages of the thread. The runtime lives on the
 * main thread, the C++ side proxies its calls there; a call that reaches a pthread is a bug. */
function registerPthread(): void {
    (globalThis as any).DUCKDB_RUNTIME = new Proxy(
        {},
        {
            get: (_target, name) => {
                throw new Error(`runtime.${String(name)} was called on a pthread, runtime calls belong to the main thread`);
            },
        },
    );
    DuckDBWasm({});
}

if ((globalThis as any).name === 'em-pthread') {
    registerPthread();
} else {
    registerWorker();
}
