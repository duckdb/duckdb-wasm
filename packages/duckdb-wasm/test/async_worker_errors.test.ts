import * as duckdb from '../src/';

/** A worker that never answers, the test fires its events by hand */
class SilentWorker {
    public readonly posted: any[] = [];
    private readonly handlers = new Map<string, (event: any) => void>();

    addEventListener(type: string, handler: (event: any) => void): void {
        this.handlers.set(type, handler);
    }
    removeEventListener(type: string): void {
        this.handlers.delete(type);
    }
    postMessage(message: any): void {
        this.posted.push(message);
    }
    terminate(): void {}
    emit(type: string, event: any = {}): void {
        this.handlers.get(type)!(event);
    }
}

export function testAsyncWorkerErrors(): void {
    describe('AsyncDuckDB worker failures', () => {
        let worker: SilentWorker;
        let db: duckdb.AsyncDuckDB;
        let consoleError: jasmine.Spy;
        let consoleWarn: jasmine.Spy;

        beforeEach(() => {
            consoleError = spyOn(console, 'error');
            consoleWarn = spyOn(console, 'warn');
            worker = new SilentWorker();
            db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker as unknown as Worker);
        });

        it('rejects the waiting calls when the worker fires an error event', async () => {
            const first = db.ping();
            const second = db.ping();
            expect(worker.posted.length).toBe(2);
            worker.emit('error', { message: 'boom', filename: 'worker.js', lineno: 7 });
            await expectAsync(first).toBeRejectedWithError('error in duckdb worker: boom (worker.js:7)');
            await expectAsync(second).toBeRejectedWithError('error in duckdb worker: boom (worker.js:7)');
            expect(consoleError).toHaveBeenCalled();
        });

        it('rejects only the calls that were waiting when the error arrived', async () => {
            const before = db.ping();
            worker.emit('error', { message: 'boom', filename: 'worker.js', lineno: 7 });
            await expectAsync(before).toBeRejected();
            const after = db.ping();
            worker.emit('message', {
                data: { requestId: worker.posted[1].messageId, type: duckdb.WorkerResponseType.OK, data: null },
            });
            await expectAsync(after).toBeResolved();
        });

        it('rejects the waiting calls when the worker closes', async () => {
            const pending = db.ping();
            worker.emit('close');
            await expectAsync(pending).toBeRejectedWithError('worker terminated with 1 pending requests');
            expect(consoleWarn).toHaveBeenCalled();
        });

        it('leaves a closed worker with no waiting call alone', () => {
            worker.emit('close');
            expect(consoleWarn).not.toHaveBeenCalled();
        });
    });
}
