// The browser suite against the threads bundle: the page is cross-origin isolated, so selectBundle picks threads
const base = require('./karma.base.cjs');

if (process.env.CHROME_BIN === 'undefined') {
    process.env.CHROME_BIN = require('puppeteer').executablePath();
}

module.exports = function (config) {
    config.set({
        ...base(config),
        browsers: ['ChromeHeadlessNoSandbox'],
        reporters: ['spec'],
        // KARMA_GREP=pattern runs a slice of the suite
        client: {
            ...base(config).client,
            args: process.env.KARMA_GREP ? ['--grep', process.env.KARMA_GREP] : [],
        },
        customHeaders: [
            { match: '.*', name: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
            { match: '.*', name: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
    });
};
