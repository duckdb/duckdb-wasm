const puppeteer = require('puppeteer');

process.env.CHROME_BIN = puppeteer.executablePath();

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
            { pattern: 'packages/duckdb/dist/*', included: false, watched: false, served: true },
            { pattern: 'node_modules/sql.js/dist/*.wasm', included: false, watched: false, served: true },
            { pattern: 'data/**/*.parquet', included: false, watched: false, served: true },
            { pattern: 'data/**/*.tbl', included: false, watched: false, served: true },
            { pattern: 'data/**/*.zip', included: false, watched: false, served: true },
        ],
        preprocessors: {
            '**/*.js': ['sourcemap'],
        },
        proxies: {
            '/static/': '/base/packages/duckdb/dist/',
            '/sqljs/': '/base/node_modules/sql.js/dist/',
            '/data/': '/base/data/',
        },
        exclude: [],
        reporters: ['dots'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        singleRun: true,
        // browsers: ['ChromeHeadlessNoSandbox', 'FirefoxHeadless'],
        browsers: ['ChromeHeadlessNoSandbox'],
        customLaunchers: {
            ChromeHeadlessNoSandbox: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox', '--js-flags="--experimental-wasm-eh"'],
            },
        },
        client: {
            captureConsole: true,
        },
        concurrency: 1, // only one browser at a time
        browserNoActivityTimeout: 999999999,
        pingTimeout: 999999999,
    });
};
