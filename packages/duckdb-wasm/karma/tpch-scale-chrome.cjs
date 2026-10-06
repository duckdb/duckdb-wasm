// TPC-H scale factor search (test/index_tpch_scale.ts), not part of the regular suite:
//   EXTRA_CMAKE_FLAGS=-DDUCKDB_WASM_STATIC_TPCH=1 ./scripts/wasm_build_lib.sh relsize base
//   yarn workspace @duckdb/duckdb-wasm build:debug
//   CHROME_BIN=... karma start ./karma/tpch-scale-chrome.cjs
const base = require('./karma.base.cjs');

if (process.env.CHROME_BIN === 'undefined') {
    process.env.CHROME_BIN = require('puppeteer').executablePath();
}

const HOURS = 4 * 60 * 60 * 1000;

module.exports = function (config) {
    const cfg = base(config);
    config.set({
        ...cfg,
        files: [
            { pattern: 'packages/duckdb-wasm/dist/tests-tpch-scale.js' },
            { pattern: 'packages/duckdb-wasm/dist/*.wasm', included: false, watched: false, served: true },
            { pattern: 'packages/duckdb-wasm/dist/*.js', included: false, watched: false, served: true },
            { pattern: 'packages/duckdb-wasm/dist/*.js.map', included: false, watched: false, served: true },
        ],
        preprocessors: {},
        browsers: ['ChromeHeadlessNoSandbox'],
        reporters: ['spec'],
        client: { jasmine: { failFast: true, timeoutInterval: HOURS, random: false } },
        captureTimeout: HOURS,
        browserDisconnectTimeout: HOURS,
        browserNoActivityTimeout: HOURS,
        processKillTimeout: HOURS,
        singleRun: true,
    });
};
