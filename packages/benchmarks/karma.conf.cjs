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
            { pattern: 'data/uni/*', included: false, watched: false, served: true },
            { pattern: 'data/tpch/0_1/**/*', included: false, watched: false, served: true },
            { pattern: 'packages/benchmarks/src/scripts/*.sql', included: false, watched: false, served: true },
        ],
        preprocessors: {
            '**/*.js': ['sourcemap'],
        },
        proxies: {
            '/static/': '/base/packages/duckdb/dist/',
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
        browsers: ['ChromeHeadlessNoSandbox', 'FirefoxHeadless'],
        // browsers: ['ChromeHeadlessNoSandbox'],
        // browsers: [],
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
