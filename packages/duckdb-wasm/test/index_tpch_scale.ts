/**
 * TPC-H scale factor search in the browser, single-threaded: the largest scale factor that generates and runs all
 * 22 queries, without spilling and with spilling to js_buffer://. Every stage is logged. Needs a wasm with the
 * tpch extension linked in (EXTRA_CMAKE_FLAGS=-DDUCKDB_WASM_STATIC_TPCH=1). Run with karma/tpch-scale-chrome.cjs.
 */
import * as duckdb from '../src/';

const BUNDLES: Record<string, duckdb.DuckDBBundle> = {
    base: {
        mainModule: '/base/packages/duckdb-wasm/dist/duckdb-base.wasm',
        mainWorker: '/base/packages/duckdb-wasm/dist/duckdb-browser-base.worker.js',
        pthreadWorker: null,
    },
    threads: {
        mainModule: '/base/packages/duckdb-wasm/dist/duckdb-threads.wasm',
        mainWorker: '/base/packages/duckdb-wasm/dist/duckdb-browser-threads.worker.js',
        pthreadWorker: null,
    },
};
/** Cross-origin isolated pages compare both bundles at fixed scale factors, others search the base bundle */
const COMPARE = globalThis.crossOriginIsolated === true;
const COMPARE_SFS = [1, 2];
let BUNDLE: duckdb.DuckDBBundle = BUNDLES.base;

/** Doubling steps, then a bisection between the last success and the first failure */
const START_SF = 0.25;
const MAX_SF = 32;
const BISECT_STEPS = 2;
const QUERIES = 22;

type Stage = { sf: number; spill: boolean; stage: string; ms: number; ok: boolean; detail: string };
const log: Stage[] = [];

function now(): number {
    return performance.now();
}
function fmtMB(bytes: number): string {
    return (bytes / 1048576).toFixed(0) + 'MB';
}
function jsHeap(): string {
    const m = (performance as any).memory;
    return m ? `jsHeap=${fmtMB(m.usedJSHeapSize)}` : '';
}
function record(stage: Stage) {
    log.push(stage);
    console.log(
        `[tpch] ${BUNDLE === BUNDLES.threads ? 'threads' : 'base   '} sf=${stage.sf} spill=${stage.spill ? 'on ' : 'off'} ${stage.stage.padEnd(10)} ` +
            `${stage.ok ? 'ok  ' : 'FAIL'} ${String(Math.round(stage.ms)).padStart(7)}ms ${stage.detail}`,
    );
}

type Mode = { spill: boolean; memoryLimit?: string };
function modeName(mode: Mode): string {
    return `spill=${mode.spill ? 'on ' : 'off'}${mode.memoryLimit ? ` limit=${mode.memoryLimit}` : ''}`;
}

/** Generate and run one scale factor in a fresh worker, true if everything completed */
async function runScaleFactor(sf: number, mode: Mode): Promise<boolean> {
    const spill = mode.spill;
    const logger = new duckdb.VoidLogger();
    const worker = new Worker(BUNDLE.mainWorker!);
    const db = new duckdb.AsyncDuckDB(logger, worker);
    let ok = true;
    try {
        await db.instantiate(BUNDLE.mainModule, BUNDLE.pthreadWorker);
        await db.open({ spill });
        const conn = await db.connect();
        const one = async (sql: string) => (await conn.query(sql)).toArray()[0]?.toJSON();
        // The search is single-threaded, the comparison runs each bundle with its default threads
        if (!COMPARE) await conn.query(`SET threads = 1`);
        if (mode.memoryLimit) {
            await conn.query(`SET memory_limit = '${mode.memoryLimit}'`);
        }
        const settings = await one(
            `SELECT current_setting('memory_limit') AS mem, current_setting('temp_directory') AS tmp, current_setting('threads') AS threads`,
        );
        const memory = async () => {
            const m = await one(
                `SELECT sum(memory_usage_bytes)::BIGINT AS used, sum(temporary_storage_bytes)::BIGINT AS spilled FROM duckdb_memory()`,
            );
            return `duckdb=${fmtMB(Number(m.used))} spilled=${fmtMB(Number(m.spilled))} ${jsHeap()}`;
        };
        record({ sf, spill, stage: 'open', ms: 0, ok: true, detail: `memory_limit=${settings.mem} temp=${settings.tmp} threads=${settings.threads}` });

        // Generate
        let t = now();
        try {
            await conn.query(`CALL dbgen(sf = ${sf})`);
            const rows = await one(`SELECT count(*)::BIGINT AS n FROM lineitem`);
            record({ sf, spill, stage: 'dbgen', ms: now() - t, ok: true, detail: `lineitem=${rows.n} ${await memory()}` });
        } catch (e: any) {
            record({ sf, spill, stage: 'dbgen', ms: now() - t, ok: false, detail: String(e?.message ?? e).split('\n')[0] });
            return false;
        }

        // Queries
        for (let q = 1; q <= QUERIES; q++) {
            t = now();
            try {
                const result = await conn.query(`PRAGMA tpch(${q})`);
                record({ sf, spill, stage: `q${q}`, ms: now() - t, ok: true, detail: `rows=${result.numRows} ${await memory()}` });
            } catch (e: any) {
                record({ sf, spill, stage: `q${q}`, ms: now() - t, ok: false, detail: String(e?.message ?? e).split('\n')[0] });
                ok = false;
                break;
            }
        }
        await conn.close();
    } catch (e: any) {
        record({ sf, spill, stage: 'instance', ms: 0, ok: false, detail: String(e?.message ?? e).split('\n')[0] });
        ok = false;
    } finally {
        try {
            await db.terminate();
        } catch (e) {
            // the worker may be gone already
        }
    }
    return ok;
}

/** The largest viable scale factor: doubling, then bisection */
async function search(mode: Mode): Promise<{ best: number; firstFail: number | null }> {
    let best = 0;
    let firstFail: number | null = null;
    for (let sf = START_SF; sf <= MAX_SF; sf *= 2) {
        console.log(`[tpch] === ${modeName(mode)} trying sf=${sf} (doubling)`);
        if (await runScaleFactor(sf, mode)) {
            best = sf;
        } else {
            firstFail = sf;
            break;
        }
    }
    for (let i = 0; i < BISECT_STEPS && firstFail !== null; i++) {
        // dbgen floors scale factors above 1, the search is in whole numbers there
        const mid = best >= 1 ? Math.floor((best + firstFail) / 2) : Math.round(((best + firstFail) / 2) * 100) / 100;
        if (mid <= best || mid >= firstFail) break;
        console.log(`[tpch] === ${modeName(mode)} trying sf=${mid} (bisect between ${best} and ${firstFail})`);
        if (await runScaleFactor(mid, mode)) {
            best = mid;
        } else {
            firstFail = mid;
        }
    }
    return { best, firstFail };
}

describe('TPC-H scale factor search', () => {
    it('compares the bundles at fixed scale factors', async () => {
        if (!COMPARE) {
            pending('comparison needs a cross-origin isolated page');
            return;
        }
        for (const name of ['base', 'threads']) {
            BUNDLE = BUNDLES[name];
            for (const sf of COMPARE_SFS) {
                console.log(`[tpch] === bundle=${name} sf=${sf}`);
                const ok = await runScaleFactor(sf, { spill: true });
                console.log(`[tpch] RESULT bundle=${name} sf=${sf} ${ok ? 'ok' : 'FAILED'}`);
            }
        }
        console.log('[tpch] SUMMARY');
        for (const s of log.filter(e => e.stage === 'dbgen' || e.stage.startsWith('q') || !e.ok)) {
            console.log(`[tpch]   sf=${s.sf} ${s.stage.padEnd(6)} ${s.ok ? 'ok  ' : 'FAIL'} ${String(Math.round(s.ms)).padStart(7)}ms ${s.detail}`);
        }
    });

    it('finds the largest viable scale factor without and with spilling', async () => {
        if (COMPARE) {
            pending('the search runs on a plain page');
            return;
        }
        const modes: Mode[] = [{ spill: false }, { spill: true }, { spill: true, memoryLimit: '2GB' }];
        const results: { mode: Mode; best: number; firstFail: number | null }[] = [];
        for (const mode of modes) {
            const result = await search(mode);
            results.push({ mode, ...result });
            console.log(`[tpch] RESULT ${modeName(mode)}: largest ok sf=${result.best}, first failure sf=${result.firstFail}`);
        }
        const without = results[0];
        const withSpill = results[1];
        // Summary table
        console.log('[tpch] SUMMARY');
        for (const s of log.filter(e => e.stage === 'dbgen' || !e.ok || e.stage === 'q22')) {
            console.log(
                `[tpch]   sf=${String(s.sf).padEnd(5)} spill=${s.spill ? 'on ' : 'off'} ${s.stage.padEnd(6)} ` +
                    `${s.ok ? 'ok  ' : 'FAIL'} ${String(Math.round(s.ms)).padStart(7)}ms ${s.detail}`,
            );
        }
        expect(withSpill.best).toBeGreaterThanOrEqual(without.best);
    });
});
