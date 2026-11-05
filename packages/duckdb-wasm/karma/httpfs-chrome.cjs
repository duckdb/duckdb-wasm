// Requires matching loadable base/threads builds. HTTPFS_HTTPS_URL adds a live HTTPS regression.
const base = require('./karma.base.cjs');
const { gzipSync } = require('node:zlib');

const csv = Buffer.from('id,name\n1,duck\n2,goose\n3,swan\n');
const compressedCSV = gzipSync(csv);

function fixture() {
    return (request, response, next) => {
        const path = request.url.split('?')[0];
        const s3Path = path === '/test-bucket/data.csv' || path.startsWith('/test-bucket/put-');
        if (!path.startsWith('/httpfs-fixture/') && !s3Path) {
            return next();
        }
        if (path === '/httpfs-fixture/protected.csv') {
            // rawHeaders catches duplicate field lines as well as combined values.
            for (const [name, expected] of [
                ['x-httpfs-test', 'secret'],
                ['x-httpfs-setting', 'setting'],
            ]) {
                const values = [];
                for (let i = 0; i < request.rawHeaders.length; i += 2) {
                    if (request.rawHeaders[i].toLowerCase() === name) values.push(request.rawHeaders[i + 1]);
                }
                if (values.length !== 1 || values[0] !== expected) {
                    response.writeHead(403);
                    response.end(`Expected exactly one ${name} header with value ${expected}`);
                    return;
                }
            }
        }
        if (s3Path && !request.headers.authorization?.includes('Credential=browser-test/')) {
            response.writeHead(403);
            response.end('Missing S3 signature');
            return;
        }
        if (request.method === 'PUT') {
            request.on('data', () => {});
            request.on('end', () => {
                if (path === '/test-bucket/put-accepted.csv') {
                    // httpfs only shows a PUT body in its error text, and the body was dropped for 2xx statuses
                    // only, so answer with a 2xx that httpfs rejects as an upload status.
                    response.writeHead(202, { 'Content-Type': 'application/xml', ETag: '"put-accepted"' });
                    response.end(
                        '<Error><Code>PutBodyPreserved</Code><Message>202 body reached httpfs</Message></Error>',
                    );
                    return;
                }
                response.writeHead(200, { 'Content-Type': 'application/json', ETag: '"put-ok"' });
                response.end('{"arn":"arn:aws:s3tables:us-east-1:123456789012:bucket/put-ok"}');
            });
            return;
        }
        const data = path.endsWith('.gz') ? compressedCSV : csv;
        const headers = {
            'Content-Type': 'application/octet-stream',
            'Content-Length': data.length,
            'Accept-Ranges': 'bytes',
            ETag: '"httpfs-fixture"',
            'Cache-Control': 'no-store',
        };
        const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range || '');
        if (request.method !== 'HEAD' && range) {
            const begin = Number(range[1]);
            const end = Math.min(range[2] ? Number(range[2]) : data.length - 1, data.length - 1);
            if (begin >= data.length) {
                response.writeHead(416, { 'Content-Range': `bytes */${data.length}` });
                response.end();
                return;
            }
            const body = data.subarray(begin, end + 1);
            response.writeHead(206, {
                ...headers,
                'Content-Length': body.length,
                'Content-Range': `bytes ${begin}-${end}/${data.length}`,
            });
            response.end(body);
        } else {
            response.writeHead(200, headers);
            response.end(request.method === 'HEAD' ? undefined : data);
        }
    };
}

module.exports = config => {
    const cfg = base(config);
    config.set({
        ...cfg,
        frameworks: ['jasmine'],
        plugins: [...cfg.plugins, { 'middleware:httpfs-fixture': ['factory', fixture] }],
        middleware: ['httpfs-fixture'],
        files: [
            { pattern: 'packages/duckdb-wasm/dist/tests-httpfs.js' },
            { pattern: 'packages/duckdb-wasm/dist/*.wasm', included: false, watched: false },
            { pattern: 'packages/duckdb-wasm/dist/*.js', included: false, watched: false },
            { pattern: 'build/extension_repository/**/*.wasm', included: false, watched: false },
            { pattern: 'data/uni/*.parquet', included: false, watched: false },
        ],
        preprocessors: {},
        reporters: ['spec'],
        customHeaders: [
            { match: '.*', name: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
            { match: '.*', name: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
        client: {
            args: process.env.HTTPFS_HTTPS_URL ? [process.env.HTTPFS_HTTPS_URL] : [],
            jasmine: { failFast: false, random: false, timeoutInterval: 100000 },
        },
        captureTimeout: 60000,
        browserDisconnectTimeout: 10000,
        browserDisconnectTolerance: 0,
        browserNoActivityTimeout: 110000,
        processKillTimeout: 10000,
    });
};
