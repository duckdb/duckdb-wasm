const path = require('path');
const InjectPlugin = require('webpack-inject-plugin').default;

module.exports = {
    entry: './src/index_browser.ts',
    mode: 'production',
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                options: { allowTsInNodeModules: true },
            },
        ],
        noParse: /sql\.js|node_modules\/benchmark/,
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bench-browser.js',
        library: 'bench_browser',
        libraryTarget: 'window',
        libraryExport: 'default',
    },
    plugins: [
        new InjectPlugin(function () {
            return 'window._ = require("lodash");window.Benchmark = require("benchmark");var exports = {};';
        }),
    ],
};
