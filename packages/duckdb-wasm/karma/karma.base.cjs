const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

process.env.CHROME_BIN = puppeteer.executablePath();

const JS_TIMEOUT = 900000;

function findByPath(files, path) {
    return Array.from(files).find(file => file.path === path);
}

function composeUrl(url, basePath, urlRoot) {
    return url
        .replace(urlRoot, '/')
        .replace(/\?.*$/, '')
        .replace(/^\/absolute/, '')
        .replace(/^\/base/, basePath);
}

function HeadersMiddlewareFactory(filesPromise, basePath, urlRoot) {
    return function (request, response, next) {
        const requestedFilePath = composeUrl(request.url, basePath, urlRoot);
        return filesPromise.then(function (files) {
            const file = findByPath(files.served, requestedFilePath);
            if (file) {
                response.setHeader('Accept-Ranges', 'bytes');
                response.setHeader('Content-Length', file.content.length);
            }
            return next();
        });
    };
}
HeadersMiddlewareFactory.$inject = ['filesPromise', 'config.basePath', 'config.urlRoot'];

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
            { 'middleware:headers': ['factory', HeadersMiddlewareFactory] },
        ],
        frameworks: ['jasmine'],
        beforeMiddleware: ['headers'],
        files: [
            { pattern: 'packages/duckdb-wasm/dist/tests-browser.js' },
            { pattern: 'packages/duckdb-wasm/dist/*.wasm', included: false, watched: false, served: true },
            { pattern: 'packages/duckdb-wasm/dist/*.js', included: false, watched: false, served: true },
            { pattern: 'data/tpch/0*/duckdb/db', included: false, watched: false, served: true },
            { pattern: 'data/tpch/0*/parquet/*.parquet', included: false, watched: false, served: true },
            { pattern: 'data/uni/*.parquet', included: false, watched: false, served: true },
            { pattern: 'data/**/*.zip', included: false, watched: false, served: true },
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
        browsers: ['ChromeHeadlessNoSandbox', 'ChromeHeadlessNoSandboxEH'],
        customLaunchers: {
            ChromeHeadlessNoSandbox: {
                base: 'ChromeHeadless',
                flags: ['--disable-gpu', '--no-sandbox'],
            },
            ChromeHeadlessNoSandboxEH: {
                base: 'ChromeHeadless',
                flags: ['--disable-gpu', '--no-sandbox', '--js-flags="--experimental-wasm-eh"'],
            },
            ChromeHeadlessNoSandboxEHThreads: {
                base: 'ChromeHeadless',
                flags: [
                    '--disable-gpu',
                    '--no-sandbox',
                    '--js-flags="--experimental-wasm-eh --experimental-wasm-threads"',
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
