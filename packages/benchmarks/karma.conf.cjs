const puppeteer = require('puppeteer');

process.env.CHROME_BIN = puppeteer.executablePath();

const JS_TIMEOUT = 90000000;

module.exports = function (config) {
    config.set({
        basePath: '../..',
        plugins: [
            'karma-chrome-launcher',
            'karma-firefox-launcher',
            'karma-sourcemap-loader',
            'karma-spec-reporter',
            'karma-custom',
        ],
        frameworks: ['custom'],
        files: [
            { pattern: 'packages/benchmarks/dist/bench-browser.js' },
            { pattern: 'packages/benchmarks/dist/bench-browser.js.map', included: false, watched: false, served: true },
            { pattern: 'packages/duckdb-wasm/dist/*', included: false, watched: false, served: true },
            { pattern: 'node_modules/sql.js/dist/*.wasm', included: false, watched: false, served: true },
            { pattern: 'data/uni/*', included: false, watched: false, served: true },
            { pattern: 'data/tpch/0_1/**/*', included: false, watched: false, served: true },
            { pattern: 'packages/benchmarks/src/scripts/*.sql', included: false, watched: false, served: true },
        ],
        preprocessors: {
            '**/*.js': ['sourcemap'],
        },
        proxies: {
            '/static/': '/base/packages/duckdb-wasm/dist/',
            '/sqljs/': '/base/node_modules/sql.js/dist/',
            '/data/': '/base/data/',
            '/scripts/': '/base/packages/benchmarks/src/scripts/',
        },
        exclude: [],
        reporters: ['dots'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        singleRun: false,
        // browsers: ['ChromeHeadlessNoSandbox', 'FirefoxHeadless'],
        // browsers: ['ChromeHeadlessNoSandbox'],
        browsers: [],
        customLaunchers: {
            ChromeHeadlessNoSandbox: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox', '--js-flags="--experimental-wasm-eh"'],
            },
        },
        client: {
            captureConsole: true,
        },
        captureTimeout: JS_TIMEOUT,
        browserDisconnectTimeout: JS_TIMEOUT,
        browserDisconnectTolerance: 1,
        browserNoActivityTimeout: JS_TIMEOUT,
        processKillTimeout: JS_TIMEOUT,
        concurrency: 1,
    });
};
