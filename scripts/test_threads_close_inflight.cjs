// Checks that conn.close(), db.reset() and db.open() finish while a query runs on the threaded build.
//
// Teardown must leave the main runtime thread serving file reads while Executor::CancelTasks drains workers.
// Otherwise teardown waits for a worker whose read is waiting for that same main thread.
//
// With the async API this is conn.send(sql) followed by conn.close(), db.reset() or db.open() before the result
// header arrived: send() polls in separate worker messages, so the teardown can run between two polls.
//
// Usage: node scripts/test_threads_close_inflight.cjs [options] [scenario ...]
//   --threads=N      maximumThreads for the database (default 4: the query thread and three workers)
//   --copies=N       initial file reads per query (default 16; doubles after an inconclusive attempt)
//   --query=blob|csv read_blob reads a file in one call and does nothing else, so a worker is inside a read whenever
//                    it runs (default). read_csv parses between reads, so teardown does not always overlap a read.
//   --timeout=S      seconds after which a child is killed and reported as HANG (default 30)
//
// Each scenario runs in a child process, because a blocked main thread cannot fire JavaScript timers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const bindings = path.join(root, 'packages/duckdb-wasm/src/bindings');
const dataFile = path.join(os.tmpdir(), 'duckdb-wasm-close-inflight.csv');
const dataRows = 3000000;
const maxAttempts = 4;

const queries = {
    blob: files => `SELECT count(*), sum(octet_length(content)) FROM read_blob([${files}])`,
    csv: files => `SELECT count(*), max(len(s)) FROM read_csv([${files}]) WHERE i % 7 = 0`,
};

// The controls run the same teardown and finish: cancelPendingQuery destroys the result on the query thread while
// the main thread serves, a finished query has no tasks in flight, and without workers the query thread only runs
// tasks inside a poll (more copies keep that query unfinished after the first poll).
const scenarios = {
    close: { expect: 'ok' },
    reset: { expect: 'ok' },
    open: { expect: 'ok' },
    'cancel-then-close': { expect: 'ok' },
    'finished-then-close': { expect: 'ok' },
    'close-single-thread': { expect: 'ok', threads: 1, copies: 64 },
};

const args = process.argv.slice(2);
const option = (name, fallback) => {
    const match = args.find(arg => arg.startsWith(`--${name}=`));
    return match ? match.slice(name.length + 3) : fallback;
};
const selected = args.filter(arg => !arg.startsWith('--'));
const queryName = option('query', 'blob');
const log = message => fs.writeSync(1, `${message}\n`);

function child(scenario) {
    const threads = Number(option('threads', 4));
    const copies = Number(option('copies', 16));
    const lib = require(path.join(root, 'packages/duckdb-wasm/dist/duckdb-node-blocking.cjs'));
    const DuckDBWasm = require(path.join(bindings, 'duckdb-threads.js'));
    class ThreadsBindings extends lib.DuckDBBindingsBase {
        instantiateImpl(overrides) {
            globalThis.DUCKDB_RUNTIME = this._runtime;
            return DuckDBWasm({ ...overrides, locateFile: file => path.join(bindings, file) });
        }
    }
    const started = Date.now();
    const step = message => log(`  [${String(Date.now() - started).padStart(5)}ms] ${message}`);
    const config = { maximumThreads: threads, query: { queryPollingInterval: 0 } };
    (async () => {
        const db = new ThreadsBindings(new lib.VoidLogger(), lib.NODE_RUNTIME);
        await db.instantiate();
        db.open(config);
        const setup = db.connect();
        const settings = setup
            .query("SELECT current_setting('threads')::VARCHAR AS threads, platform FROM pragma_platform()")
            .toArray()[0]
            .toJSON();
        step(`platform ${settings.platform}, threads ${settings.threads}`);
        // Direct I/O: every read reaches the runtime on the main thread instead of the page cache
        const files = [];
        for (let i = 0; i < copies; i++) {
            files.push(`inflight_${i}.csv`);
            db.registerFileURL(files[i], dataFile, lib.DuckDBDataProtocol.NODE_FS, true);
        }
        const query = queries[queryName](files.map(file => `'${file}'`).join(', '));

        const conn = db.connect().useUnsafe((_, handle) => handle);
        const submitted = Date.now();
        let header = db.startPendingQuery(conn, query, false);
        if (scenario === 'finished-then-close') {
            let polls = 0;
            while (header === null) {
                header = db.pollPendingQuery(conn);
                polls++;
            }
            step(`query finished after ${polls} polls, ${Date.now() - submitted}ms`);
        } else {
            if (header === null) header = db.pollPendingQuery(conn);
            if (header !== null) {
                step('INCONCLUSIVE: the query finished before the teardown, raise --copies');
                process.exit(3);
            }
            step(`query still running after one poll, ${Date.now() - submitted}ms`);
            if (scenario === 'cancel-then-close') {
                const cancelled = db.cancelPendingQuery(conn);
                assert.equal(cancelled, true, 'Expected cancellation of an active pending query');
                step(`cancelPendingQuery -> ${cancelled}`);
            }
        }
        const teardown = {
            reset: ['db.reset()', () => db.reset()],
            open: ['db.open(config)', () => db.open(config)],
        }[scenario] ?? ['conn.close()', () => db.disconnect(conn)];
        step(`${teardown[0]} ...`);
        teardown[1]();
        step(`${teardown[0]} returned`);
        const check = db.connect();
        const value = check.query('SELECT 42 AS value').toArray()[0].toJSON().value;
        if (value !== 42) throw new Error(`Expected 42 after teardown, got ${value}`);
        check.close();
        step('SELECT 42 on a new connection returned 42');
        process.exit(0);
    })().catch(error => {
        step(`ERROR ${error.stack || error}`);
        process.exit(1);
    });
}

function runScenario(name, { threads, copies, queryName, timeout, report = log }, runChild = spawnSync) {
    let attempts = 0;
    let outcome;
    while (attempts < maxAttempts) {
        attempts++;
        report(`${name} (maximumThreads ${threads}, ${copies} copies, ${queryName}, attempt ${attempts}/${maxAttempts}):`);
        const run = runChild(
            process.execPath,
            [__filename, '--child', `--threads=${threads}`, `--copies=${copies}`, `--query=${queryName}`, name],
            { stdio: 'inherit', timeout: timeout * 1000, killSignal: 'SIGKILL' },
        );
        outcome = run.signal === 'SIGKILL' ? 'HANG'
            : run.error ? `error ${run.error.code || run.error.message}`
            : run.signal ? `signal ${run.signal}`
            : run.status === 0 ? 'ok' : `exit ${run.status}`;
        if (outcome === 'HANG') report(`  killed after ${timeout}s`);
        if (run.status !== 3 || run.error || run.signal) break;
        if (attempts === maxAttempts) {
            outcome = 'INCONCLUSIVE';
            report(`  no active query observed after ${maxAttempts} attempts`);
            break;
        }
        copies *= 2;
        report(`  query finished too early; retrying with ${copies} copies`);
    }
    return { name, threads, copies, attempts, outcome, expect: scenarios[name].expect };
}

function parent() {
    const names = selected.length ? selected : Object.keys(scenarios);
    for (const name of names) {
        if (!scenarios[name]) {
            console.error(`Unknown scenario ${name}. Known: ${Object.keys(scenarios).join(', ')}`);
            process.exit(2);
        }
    }
    if (!queries[queryName]) {
        console.error(`Unknown query ${queryName}. Known: ${Object.keys(queries).join(', ')}`);
        process.exit(2);
    }
    const timeout = Number(option('timeout', 30));
    if (!fs.existsSync(dataFile)) {
        log(`writing ${dataRows} rows to ${dataFile}`);
        const fd = fs.openSync(dataFile, 'w');
        fs.writeSync(fd, 'i,s\n');
        for (let i = 0; i < dataRows; i += 100000) {
            const lines = [];
            for (let j = i; j < Math.min(i + 100000, dataRows); j++) lines.push(`${j},${'x'.repeat(50)}${j}`);
            fs.writeSync(fd, lines.join('\n') + '\n');
        }
        fs.closeSync(fd);
    }
    const results = [];
    for (const name of names) {
        const threads = scenarios[name].threads ?? option('threads', 4);
        const copies = Number(scenarios[name].copies ?? option('copies', 16));
        results.push(runScenario(name, { threads, copies, queryName, timeout }));
    }
    log('');
    for (const { name, threads, copies, attempts, outcome, expect } of results) {
        const note = outcome === expect ? '' : `(expected ${expect})`;
        log(`${name.padEnd(22)} threads=${threads}  ${outcome.padEnd(12)} copies=${copies} attempts=${attempts} ${note}`);
    }
    process.exitCode = results.every(result => result.outcome === result.expect) ? 0 : 1;
}

module.exports = { runScenario };

if (require.main === module) {
    if (args.includes('--child')) child(selected[0]);
    else parent();
}
