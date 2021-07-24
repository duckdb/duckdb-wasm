const puppeteer = require('puppeteer');
const zlib = require('zlib');

const bytesToSize = bytes => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) {
        return '0 Byte';
    }
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
    return Math.round(bytes / 1024 ** i, 2) + sizes[i];
};
// Preprocess files to provide a gzip compressed alternative version
function GZIPPreprocessor(config, logger) {
    const log = logger.create('preprocessor.gzip');

    var pre = (content, file, done) => {
        const originalSize = content.length;
        // const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content);

        zlib.gzip(content, (err, gzippedContent) => {
            if (err) {
                log.error(err);
                done(err);
                return;
            }

            // eslint-disable-next-line no-param-reassign
            file.encodings.gzip = gzippedContent;

            log.info(
                `compressed ${file.originalPath} [${bytesToSize(originalSize)} -> ${bytesToSize(
                    gzippedContent.length,
                )}]`,
            );
            done(null, content);
        });
    };
    pre.handleBinaryFiles = true;
    return pre;
}

GZIPPreprocessor.$inject = ['config.gzip', 'logger'];

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
                const content = file.encodings.gzip || file.content;
                response.setHeader(
                    'Content-Length',
                    /* needed to get UTF-8 byte length */
                    typeof content == 'string' ? new TextEncoder().encode(content).length : content.length,
                );
            }
            return next();
        });
    };
}
HeadersMiddlewareFactory.$inject = ['filesPromise', 'config.basePath', 'config.urlRoot'];

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
            { 'preprocessor:gzip': ['factory', GZIPPreprocessor] },
            { 'middleware:headers': ['factory', HeadersMiddlewareFactory] },
        ],
        frameworks: ['custom'],
        beforeMiddleware: ['headers'],
        files: [
            { pattern: 'packages/benchmarks/dist/bench-browser.js', included: true, watched: false, served: true },
            { pattern: 'packages/benchmarks/dist/bench-browser.js.map', included: false, watched: false, served: true },
            { pattern: 'packages/duckdb-wasm/dist/*', included: false, watched: false, served: true },
            { pattern: 'node_modules/sql.js/dist/*.wasm', included: false, watched: false, served: true },
            { pattern: 'data/uni/*', included: false, watched: false, served: true },
            { pattern: 'data/tpch/0_5/parquet/*', included: false, watched: false, served: true },
            { pattern: 'data/tpch/0_5/tbl/*', included: false, watched: false, served: true },
            { pattern: 'data/tpch/0_5/*', included: false, watched: false, served: true },
            { pattern: 'packages/benchmarks/src/scripts/*.sql', included: false, watched: false, served: true },
        ],
        preprocessors: {
            // '**/*.js': ['sourcemap'],
            '**/*.js': ['sourcemap', 'gzip'],
            '**/*.wasm': ['gzip'],
            '**/*.parquet': ['gzip'],
            '**/*.tbl': ['gzip'],
            '**/*.db': ['gzip'],
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
        singleRun: true,
        browsers: ['ChromeHeadlessNoSandbox', 'ChromeHeadlessNoSandboxEH', 'FirefoxHeadless'],
        customLaunchers: {
            ChromeHeadlessNoSandbox: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox'],
            },
            ChromeHeadlessNoSandboxEH: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox', '--js-flags="--experimental-wasm-eh"'],
            },
        },
        client: {
            captureConsole: true,
        },
        concurrency: 1, // only one browser at a time
        captureTimeout: 999999999,
        browserDisconnectTimeout: 999999999,
        browserDisconnectTolerance: 1,
        browserNoActivityTimeout: 999999999,
        processKillTimeout: 999999999,
        pingTimeout: 999999999,
    });
};
