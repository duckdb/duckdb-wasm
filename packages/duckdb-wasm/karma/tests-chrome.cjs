const base = require('./karma.base.cjs');

if (process.env.CHROME_BIN === 'undefined') {
    process.env.CHROME_BIN = require('puppeteer').executablePath();
}
console.log(`CHROME_BIN=${process.env.CHROME_BIN}`);

module.exports = function (config) {
    config.set({ ...base(config), browsers: ['ChromeHeadlessNoSandbox'], reporters: ['spec'] });
};
