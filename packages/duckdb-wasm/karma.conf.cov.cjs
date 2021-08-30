const base = require('./karma.base.cjs');

module.exports = function (config) {
    config.set({ ...base(config), browsers: ['ChromeHeadlessNoSandbox'], reporters: ['coverage'] });
};
