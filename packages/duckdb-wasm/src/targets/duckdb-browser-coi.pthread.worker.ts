import { DuckDB } from '../bindings/bindings_browser_coi';
import { AsyncDuckDBDispatcher, WorkerResponseVariant, WorkerRequestVariant } from '../parallel';
import { BROWSER_RUNTIME } from '../bindings/runtime_browser';
import { InstantiationProgress } from '../bindings';

class WebWorker extends AsyncDuckDBDispatcher {
    protected postMessage(response: WorkerResponseVariant, transfer: ArrayBuffer[]) {
        globalThis.postMessage(response, transfer);
    }

    protected async instantiate(
        mainModuleURL: string,
        pthreadWorkerURL: string | null,
        progress: (p: InstantiationProgress) => void,
    ) {
        // pthreadWorkerURL is ignored — Emscripten handles it internally
        const bindings = new DuckDB(this, BROWSER_RUNTIME, mainModuleURL, null);
        return await bindings.instantiate(progress);
    }
}

export function registerWorker() {
    const api = new WebWorker();
    globalThis.onmessage = async (event) => {
        await api.onMessage(event.data);
    };
}

registerWorker();
