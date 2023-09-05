if (!process.env.CHROME_BIN) {
    process.env.CHROME_BIN = require('puppeteer').executablePath();
}

const JS_TIMEOUT = 900000;

module.exports = function (config) {
    return {
        basePath: '../../..',
        plugins: [
            'karma-jasmine',
            'karma-chrome-launcher',
            'karma-firefox-launcher',
            'karma-sourcemap-loader',
            'karma-spec-reporter',
            'karma-coverage',
            'karma-jasmine-html-reporter',
            require('./s3rver/s3rver'),
        ],
        frameworks: ['jasmine', 's3rver'],
        s3rver: {
            port: 4923,
            silent: true,
        },
        files: [
            { pattern: 'packages/duckdb-wasm/dist/tests-browser.js' },
            { pattern: 'packages/duckdb-wasm/dist/*.wasm', included: false, watched: false, served: true },
            { pattern: 'packages/duckdb-wasm/dist/*.js', included: false, watched: false, served: true },
            { pattern: 'packages/duckdb-wasm/dist/*.js.map', included: false, watched: false, served: true },
            { pattern: 'data/tpch/0*/duckdb/db', included: false, watched: false, served: true },
            { pattern: 'data/tpch/0*/parquet/*.parquet', included: false, watched: false, served: true },
            { pattern: 'data/uni/*.parquet', included: false, watched: false, served: true },
        ],
        preprocessors: {
            '**/tests-**.js': ['sourcemap', 'coverage'],
        },
        proxies: {
            '/static/': '/base/packages/duckdb-wasm/dist/',
            '/data/': '/base/data/',
        },
        exclude: [],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        singleRun: true,
        browsers: ['ChromeHeadlessNoSandbox'],
        customLaunchers: {
            ChromeHeadlessNoSandbox: {
                base: 'ChromeHeadless',
                flags: ['--disable-gpu', '--no-sandbox', '--js-flags=""'],
            },
            ChromeHeadlessNoSandboxThreads: {
                base: 'ChromeHeadless',
                flags: [
                    '--disable-gpu',
                    '--no-sandbox',
                    '--js-flags="--experimental-wasm-threads"',
                ],
            },
        },
        specReporter: {
            maxLogLines: 5,
            suppressErrorSummary: true,
            suppressFailed: false,
            suppressPassed: false,
            suppressSkipped: true,
            showSpecTiming: true,
            failFast: false,
            prefixes: {
                success: '    OK: ',
                failure: 'FAILED: ',
                skipped: 'SKIPPED: ',
            },
        },
        coverageReporter: {
            type: 'json',
            dir: './packages/duckdb-wasm/coverage/',
            subdir: function (browser) {
                return browser.toLowerCase().split(/[ /-]/)[0];
            },
        },
        client: {
            jasmine: {
                failFast: true,
                timeoutInterval: JS_TIMEOUT,
            },
        },
        captureTimeout: JS_TIMEOUT,
        browserDisconnectTimeout: JS_TIMEOUT,
        browserDisconnectTolerance: 1,
        browserNoActivityTimeout: JS_TIMEOUT,
        processKillTimeout: JS_TIMEOUT,
        concurrency: 1,
    };
};
