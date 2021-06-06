const puppeteer = require('puppeteer');
/*const fs = require('fs');
const path = require('path');

function LargeFilesMiddlewareFactory(filesPromise, serveFile, basePath, urlRoot) {
    return function (request, response, next) {
        const requestedFilePath = request.url
            .replace(urlRoot, '/')
            .replace(/\?.*$/, '')
            .replace(/^\/absolute/, '')
            .replace(/^\/base/, basePath);

        request.pause();

        return filesPromise.then(function (files) {
            const file = Array.from(files.served).find(file => file.path === requestedFilePath);
            if (file && file.path.endsWith('.db')) {
                console.log(`Large-Files: Serving ${requestedFilePath}`);
                const acceptEncodingHeader = request.headers['accept-encoding'];
                const matchedEncoding = Object.keys(file.encodings).find(encoding =>
                    new RegExp(`(^|.*, ?)${encoding}(,|$)`).test(acceptEncodingHeader),
                );
                const content = file.encodings[matchedEncoding] || file.content;
                serveFile(
                    file.contentPath || file.path,
                    request.headers.range,
                    response,
                    null,
                    content,
                    file.doNotCache,
                );
            } else {
                next();
            }

            request.resume();
        });
    };
}

LargeFilesMiddlewareFactory.$inject = ['filesPromise', 'serveFile', 'config.basePath', 'config.urlRoot'];*/

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
            // { 'middleware:largeFiles': ['factory', LargeFilesMiddlewareFactory] },
        ],
        // beforeMiddleware: ['largeFiles'],
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

        concurrency: 1, // only one browser at a time
        browserNoActivityTimeout: 999999999,
        pingTimeout: 999999999,
    });
};
