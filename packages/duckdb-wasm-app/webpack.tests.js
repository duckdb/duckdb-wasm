import { configure } from './webpack.common.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.resolve(__dirname, './build/tests');

const base = configure({
    buildDir: buildDir,
    extractCss: false,
    cssIdentifier: '[hash:base64]',
});

export default {
    ...base,
    entry: {
        tests: ['./test/index.ts'],
    },
    output: {
        path: buildDir,
        filename: '[name].js',
        chunkFilename: 'static/js/[name].[contenthash].js',
        assetModuleFilename: 'static/assets/[name].[contenthash].[ext]',
        webassemblyModuleFilename: 'static/wasm/[hash].wasm',
        clean: true,
    },
    mode: 'development',
    devtool: false,
};
