// Run against the generated, patched loadable threaded glue. This forces the message ordering behind
// the dlsync race without relying on browser scheduling or pthread allocation during the smoke test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

assert.equal(process.argv.length, 3, 'Usage: node scripts/test_wasm_pthread_glue.cjs <generated-glue.js>');
const source = fs.readFileSync(process.argv[2], 'utf8');
// js-beautify gives the handler's closing brace the same indentation as its assignment.
const handlers = [...source.matchAll(/^([ \t]*)worker\.onmessage = e => \{\r?\n[\s\S]*?^\1\};/gm)];
assert.equal(handlers.length, 1, 'Expected one generated worker message handler');
const handler = handlers[0][0];
const cases = [...handler.matchAll(/case (\d+):([\s\S]*?)\bbreak;/g)];
const finishedCases = cases.filter(match => match[2].includes('markAsFinished(d.thread)'));
assert.equal(finishedCases.length, 1, 'Expected one thread completion message case');
const command = Number(finishedCases[0][1]);

const PThread = { pthreads: {} };
const finished = new Set();
function createWorker() {
    const worker = {};
    vm.runInNewContext(handler, {
        worker,
        PThread,
        markAsFinished: thread => finished.add(thread),
    });
    return worker;
}
const oldWorker = createWorker();
const replacementWorker = createWorker();
const thread = 42;
const finish = worker => worker.onmessage({ data: { cmd: command, thread } });

PThread.pthreads[thread] = oldWorker;
finish(oldWorker);
assert.ok(finished.has(thread), 'The registered worker must be able to finish');

// The old thread was joined and freed before its queued completion message was handled.
finished.clear();
delete PThread.pthreads[thread];
PThread.pthreads[thread] = replacementWorker;
finish(oldWorker);
assert.ok(!finished.has(thread), 'A stale message must not mark the replacement thread finished');
finish(replacementWorker);
assert.ok(finished.has(thread), 'The replacement worker must still be able to finish');

finished.clear();
delete PThread.pthreads[thread];
finish(replacementWorker);
assert.ok(!finished.has(thread), 'A message after cleanup must not leave a finished entry');
console.log('Pthread completion handler: current, reused and freed thread checks passed');
