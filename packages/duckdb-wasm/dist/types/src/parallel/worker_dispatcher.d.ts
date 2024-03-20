import { DuckDBBindings } from '../bindings';
import { WorkerResponseVariant, WorkerRequestVariant } from './worker_request';
import { Logger, LogEntryVariant } from '../log';
import { InstantiationProgress } from '../bindings/progress';
export declare abstract class AsyncDuckDBDispatcher implements Logger {
    /** The bindings */
    protected _bindings: DuckDBBindings | null;
    /** The next message id */
    protected _nextMessageId: number;
    /** Instantiate the wasm module */
    protected abstract instantiate(mainModule: string, pthreadWorker: string | null, progress: (p: InstantiationProgress) => void): Promise<DuckDBBindings>;
    /** Post a response to the main thread */
    protected abstract postMessage(response: WorkerResponseVariant, transfer: ArrayBuffer[]): void;
    /** Send log entry to the main thread */
    log(entry: LogEntryVariant): void;
    /** Send plain OK without further data */
    protected sendOK(request: WorkerRequestVariant): void;
    /** Fail with an error */
    protected failWith(request: WorkerRequestVariant, e: Error): void;
    /** Process a request from the main thread */
    onMessage(request: WorkerRequestVariant): Promise<void>;
}
