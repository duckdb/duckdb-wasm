const base = require('./karma.base.cjs');

module.exports = function (config) {
    config.set({
        ...base(config),
        browsers: ['FirefoxHeadless', 'ChromeHeadlessNoSandbox', 'ChromeHeadlessNoSandboxEH'],
        reporters: ['spec'],
    });
};
