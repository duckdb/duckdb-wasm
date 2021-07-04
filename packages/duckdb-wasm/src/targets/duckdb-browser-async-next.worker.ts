import { AsyncDuckDBDispatcher, WorkerResponseVariant, WorkerRequestVariant } from '../parallel';
import { DuckDB } from '../bindings/bindings_browser_next';
import { DuckDBBindings } from '../bindings';
import { BROWSER_RUNTIME } from '../bindings/runtime_browser';

/** The duckdb worker API for web workers */
class WebWorker extends AsyncDuckDBDispatcher {
    /** Post a response back to the main thread */
    protected postMessage(response: WorkerResponseVariant, transfer: ArrayBuffer[]) {
        globalThis.postMessage(response, transfer);
    }

    /** Instantiate the wasm module */
    protected async open(mainModuleURL: string, pthreadWorkerURL: string | null): Promise<DuckDBBindings> {
        const bindings = new DuckDB(this, BROWSER_RUNTIME, mainModuleURL, pthreadWorkerURL);
        return await bindings.open();
    }
}

/** Register the worker */
export function registerWorker(): void {
    const api = new WebWorker();
    globalThis.onmessage = async (event: MessageEvent<WorkerRequestVariant>) => {
        await api.onMessage(event.data);
    };
}

registerWorker();
