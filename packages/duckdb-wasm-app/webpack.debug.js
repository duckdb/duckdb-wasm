import { configure } from './webpack.common.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const base = configure({
    buildDir: path.resolve(__dirname, './build/debug'),
    tsLoaderOptions: {
        compilerOptions: {
            configFile: './tsconfig.json',
            sourceMap: true,
        },
    },
    extractCss: false,
    cssIdentifier: '[local]_[hash:base64]',
});

export default {
    ...base,
    output: {
        ...base.output,
    },
    mode: 'development',
    watchOptions: {
        ignored: ['node_modules/**', 'dist/**'],
    },
    performance: {
        hints: false,
    },
    devtool: 'source-map',
    devServer: {
        historyApiFallback: true,
        compress: true,
        port: 9002,
        static: {
            directory: path.join(__dirname, './build/app-dev'),
        },
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
            // This will enable SharedArrayBuffers in Firefox but will block most requests to third-party sites.
            //
            // "Cross-Origin-Resource-Policy": "cross-origin",
            // "Cross-Origin-Embedder-Policy": "require-corp",
            // "Cross-Origin-Opener-Policy": "same-origin"
        },
    },
};
