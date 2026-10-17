import { DuckDBBrowserBindings } from '../src/bindings/bindings_browser_common';
import { DuckDBModule } from '../src/bindings/duckdb_module';
import { InstantiationProgress } from '../src/bindings';
import { DuckDBRuntime } from '../src/bindings/runtime';
import { VoidLogger } from '../src/log';

class InstantiationBindings extends DuckDBBrowserBindings {
    public constructor() {
        super(new VoidLogger(), {} as DuckDBRuntime, 'https://example.com/duckdb.wasm', null);
    }

    protected instantiateImpl(_overrides: Partial<DuckDBModule>): Promise<DuckDBModule> {
        throw new Error('This test instantiates a standalone Wasm module');
    }

    public instantiateModule(progress?: (p: InstantiationProgress) => void): Promise<WebAssembly.Instance> {
        this.onInstantiationProgress = progress ? [progress] : [];
        return new Promise(resolve => this.instantiateWasm({}, instance => resolve(instance)));
    }
}

export function testInstantiation(): void {
    describe('Browser Wasm instantiation', () => {
        const wasm = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
        let previousRuntime: DuckDBRuntime;

        beforeEach(() => {
            previousRuntime = globalThis.DUCKDB_RUNTIME;
        });

        afterEach(() => {
            globalThis.DUCKDB_RUNTIME = previousRuntime;
        });

        function mockFetch(headers: Record<string, string>): Response {
            const response = new Response(wasm, { headers: { 'content-type': 'application/wasm', ...headers } });
            spyOn(globalThis, 'fetch').and.resolveTo(response);
            const instantiateStreaming = WebAssembly.instantiateStreaming;
            spyOn(WebAssembly, 'instantiateStreaming').and.callFake(async (source, imports) => {
                const actual = await source;
                expect(actual).toBe(response);
                return instantiateStreaming(actual, imports);
            });
            return response;
        }

        it('passes the fetched response through without cloning when progress is unused', async () => {
            const response = mockFetch({ 'content-length': String(wasm.byteLength) });
            const clone = spyOn(response, 'clone').and.callThrough();
            const instance = await new InstantiationBindings().instantiateModule();
            expect(instance instanceof WebAssembly.Instance).toBe(true);
            expect(clone).not.toHaveBeenCalled();
        });

        const cases: { name: string; headers: Record<string, string>; total: number }[] = [
            { name: 'unencoded', headers: { 'content-length': '8' }, total: 8 },
            { name: 'unknown length', headers: {}, total: 0 },
            { name: 'encoded', headers: { 'content-length': '4', 'content-encoding': 'gzip' }, total: 0 },
            { name: 'hidden encoding', headers: { 'content-length': '4' }, total: 0 },
        ];
        for (const entry of cases) {
            it(`counts progress on a clone for an ${entry.name} response`, async () => {
                const response = mockFetch(entry.headers);
                const clone = spyOn(response, 'clone').and.callThrough();
                let report: (p: InstantiationProgress) => void = () => {};
                const completed = new Promise<InstantiationProgress>(resolve => {
                    report = resolve;
                });
                const instance = await new InstantiationBindings().instantiateModule(p => {
                    if (p.bytesLoaded === wasm.byteLength) report({ ...p });
                });
                const progress = await completed;
                expect(instance instanceof WebAssembly.Instance).toBe(true);
                expect(clone).toHaveBeenCalledTimes(1);
                expect(progress.bytesLoaded).toBe(wasm.byteLength);
                expect(progress.bytesTotal).toBe(entry.total);
            });
        }
    });
}
