// Staged smoke test of the threads bundle (test/index_threads_smoke.ts), cross-origin isolated
const base = require('./karma.base.cjs');

if (process.env.CHROME_BIN === 'undefined') {
    process.env.CHROME_BIN = require('puppeteer').executablePath();
}

module.exports = function (config) {
    const cfg = base(config);
    config.set({
        ...cfg,
        files: [
            { pattern: 'packages/duckdb-wasm/dist/tests-threads-smoke.js' },
            { pattern: 'packages/duckdb-wasm/dist/*.wasm', included: false, watched: false, served: true },
            { pattern: 'packages/duckdb-wasm/dist/*.js', included: false, watched: false, served: true },
            { pattern: 'build/extension_repository/**/*.wasm', included: false, watched: false, served: true },
            { pattern: 'data/uni/*.parquet', included: false, watched: false, served: true },
        ],
        proxies: { ...cfg.proxies, '/extensions/': '/base/build/extension_repository/' },
        preprocessors: {},
        browsers: ['ChromeHeadlessNoSandbox'],
        reporters: ['spec'],
        customHeaders: [
            { match: '.*', name: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
            { match: '.*', name: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
        client: { jasmine: { failFast: true, timeoutInterval: 120000, random: false } },
        browserNoActivityTimeout: 180000,
        singleRun: true,
    });
};
