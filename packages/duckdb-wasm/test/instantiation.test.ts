import * as duckdb from '../src/';
import * as path from 'path';
import fs from 'fs';
import Worker from 'web-worker';

export function testInstantiation(adb: () => duckdb.AsyncDuckDB): void {
    describe('Instantiation', () => {
        it('instantiate with classic path-based method', async () => {
            const wasmPath = path.resolve(__dirname, './duckdb-eh.wasm');
            const workerPath = path.resolve(__dirname, './duckdb-node-eh.worker.cjs');

            const worker = new Worker(workerPath);
            try {
                const logger = new duckdb.VoidLogger();
                const adb = new duckdb.AsyncDuckDB(logger, worker);

                const start = performance.now();
                await adb.instantiate(wasmPath);
                const elapsed = performance.now() - start;

                console.log(`  [Classic path-based] ${elapsed.toFixed(2)} ms`);

                const conn = await adb.connect();
                const res = await conn.query('SELECT 42 as val');
                expect(res.getChildAt(0)?.get(0)).toBe(42);
                await conn.close();
            } finally {
                worker.terminate();
            }
        });

        it('instantiate with pre-compiled WebAssembly.Module', async () => {
            const wasmPath = path.resolve(__dirname, './duckdb-eh.wasm');
            const wasmBytes = new Uint8Array(fs.readFileSync(wasmPath));
            const wasmModule = await WebAssembly.compile(wasmBytes);

            const workerPath = path.resolve(__dirname, './duckdb-node-eh.worker.cjs');

            const worker = new Worker(workerPath);
            try {
                const logger = new duckdb.VoidLogger();
                const adb = new duckdb.AsyncDuckDB(logger, worker);

                const start = performance.now();
                await adb.instantiate(wasmModule);
                const elapsed = performance.now() - start;

                console.log(`  [Pre-compiled Module] ${elapsed.toFixed(2)} ms`);

                const conn = await adb.connect();
                const res = await conn.query('SELECT 42 as val');
                expect(res.getChildAt(0)?.get(0)).toBe(42);
                await conn.close();
            } finally {
                worker.terminate();
            }
        });
    });
}
