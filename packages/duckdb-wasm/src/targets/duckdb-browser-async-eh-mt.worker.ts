import { AsyncDuckDBDispatcher, WorkerResponseVariant, WorkerRequestVariant } from '../parallel';
import { DuckDB } from '../bindings/bindings_browser_eh_mt';
import { DuckDBBindings } from '../bindings';
import Runtime from '../bindings/runtime_browser';

/** The duckdb worker API for web workers */
class WebWorker extends AsyncDuckDBDispatcher {
    /** Post a response back to the main thread */
    protected postMessage(response: WorkerResponseVariant, transfer: ArrayBuffer[]) {
        globalThis.postMessage(response, transfer);
    }

    /** Instantiate the wasm module */
    protected async open(mainModuleURL: string, pthreadWorkerURL: string | null): Promise<DuckDBBindings> {
        const bindings = new DuckDB(this, Runtime, mainModuleURL, pthreadWorkerURL);
        await bindings.open();
        return bindings;
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
