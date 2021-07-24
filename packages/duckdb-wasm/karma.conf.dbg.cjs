const base = require('./karma.base.cjs');

module.exports = function (config) {
    config.set({ ...base(config), singleRun: false, reporters: ['kjhtml'], browsers: [] });
};
