import { AsyncDuckDBDispatcher, WorkerResponseVariant, WorkerRequestVariant } from '../parallel/';
import { DuckDBBindings } from '../bindings';
import { DuckDB } from '../bindings/bindings_node_eh';
import Runtime from '../bindings/runtime_node';

/** The duckdb worker API for node.js workers */
class NodeWorker extends AsyncDuckDBDispatcher {
    /** Post a response back to the main thread */
    protected postMessage(response: WorkerResponseVariant, transfer: ArrayBuffer[]) {
        globalThis.postMessage(response, transfer);
    }

    /** Instantiate the wasm module */
    protected async open(path: string): Promise<DuckDBBindings> {
        const bindings = new DuckDB(this, Runtime, path);
        await bindings.open();
        return bindings;
    }
}

/** Register the worker */
export function registerWorker(): void {
    const api = new NodeWorker();
    globalThis.onmessage = async (event: MessageEvent<WorkerRequestVariant>) => {
        await api.onMessage(event.data);
    };
}

registerWorker();
