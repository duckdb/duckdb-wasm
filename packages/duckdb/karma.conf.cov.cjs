const base = require('./karma.base.cjs');

module.exports = function (config) {
    config.set({ ...base(config), reporters: ['spec', 'coverage'] });
};
