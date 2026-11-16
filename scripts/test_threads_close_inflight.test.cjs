const assert = require('node:assert/strict');
const test = require('node:test');
const { runScenario } = require('./test_threads_close_inflight.cjs');

const config = { threads: 4, copies: 16, queryName: 'blob', timeout: 30, report: () => {} };

function runner(statuses) {
    const copies = [];
    const runChild = (_executable, args) => {
        copies.push(Number(args.find(arg => arg.startsWith('--copies=')).split('=')[1]));
        assert.ok(statuses.length, 'Unexpected extra child attempt');
        return statuses.shift();
    };
    return { copies, runChild };
}

test('inconclusive attempts double the workload until teardown succeeds', () => {
    const child = runner([{ status: 3 }, { status: 3 }, { status: 0 }]);
    const result = runScenario('close', config, child.runChild);
    assert.deepEqual(child.copies, [16, 32, 64]);
    assert.equal(result.outcome, 'ok');
    assert.equal(result.attempts, 3);
});

test('exhausting inconclusive attempts remains a failure', () => {
    const child = runner(Array.from({ length: 4 }, () => ({ status: 3 })));
    const result = runScenario('close', config, child.runChild);
    assert.deepEqual(child.copies, [16, 32, 64, 128]);
    assert.equal(result.outcome, 'INCONCLUSIVE');
    assert.notEqual(result.outcome, result.expect);
});

test('successful attempts and real failures are not retried', () => {
    const cases = [
        { status: 0 },
        { status: 1 },
        { status: 2 },
        { status: null, signal: 'SIGKILL', error: { code: 'ETIMEDOUT' } },
        { status: null, signal: 'SIGABRT' },
        { status: null, error: { code: 'ENOENT' } },
        { status: 3, error: { code: 'EIO' } },
    ];
    for (const status of cases) {
        const child = runner([status]);
        const result = runScenario('close', config, child.runChild);
        assert.deepEqual(child.copies, [16]);
        assert.equal(result.attempts, 1);
        if (status.status === 0) assert.equal(result.outcome, 'ok');
        else {
            assert.notEqual(result.outcome, 'ok');
            assert.notEqual(result.outcome, 'INCONCLUSIVE');
        }
    }
});
