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
            // The locally built extensions, loadable bundles load them from here
            { pattern: 'build/extension_repository/**/*.wasm', included: false, watched: false, served: true },
        ],
        preprocessors: {
            '**/tests-**.js': ['sourcemap', 'coverage'],
        },
        proxies: {
            '/static/': '/base/packages/duckdb-wasm/dist/',
            '/extensions/': '/base/build/extension_repository/',
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
                flags: [
                    '--disable-gpu',
                    '--no-sandbox',
                    '--js-flags=""',
                    // KARMA_CHROME_LOG=file collects the console of every context (workers included) in file
                    ...(process.env.KARMA_CHROME_LOG
                        ? ['--enable-logging', `--log-file=${process.env.KARMA_CHROME_LOG}`, '--v=0']
                        : []),
                ],
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
                // KARMA_NO_FAIL_FAST=1 runs the whole suite past the first failure
                failFast: !process.env.KARMA_NO_FAIL_FAST,
                // KARMA_SEED=n reproduces an order
                ...(process.env.KARMA_SEED ? { seed: process.env.KARMA_SEED } : {}),
                timeoutInterval: JS_TIMEOUT,
            },
            // KARMA_GREP=pattern runs a slice of the suite
            args: process.env.KARMA_GREP ? ['--grep', process.env.KARMA_GREP] : [],
        },
        captureTimeout: JS_TIMEOUT,
        browserDisconnectTimeout: JS_TIMEOUT,
        browserDisconnectTolerance: 1,
        browserNoActivityTimeout: JS_TIMEOUT,
        processKillTimeout: JS_TIMEOUT,
        concurrency: 1,
    };
};
