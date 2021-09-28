import path from 'path';
import { fileURLToPath } from 'url';
import WebpackInjectPlugin from 'webpack-inject-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
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
        path: path.resolve(__dirname, 'dist', 'browser'),
        filename: 'bench-browser.js',
        library: 'bench_browser',
        libraryTarget: 'window',
        libraryExport: 'default',
    },
    performance: {
        hints: false,
        maxEntrypointSize: 512000,
        maxAssetSize: 512000,
    },
    plugins: [
        new WebpackInjectPlugin.default(
            () => 'window._ = require("lodash");window.Benchmark = require("benchmark");var exports = {};',
        ),
    ],
};
