import { configure } from './webpack.common.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    ...configure({
        buildDir: path.resolve(__dirname, './build/release'),
        tsLoaderOptions: {
            compilerOptions: {
                configFile: './tsconfig.json',
                sourceMap: false,
            },
        },
        extractCss: true,
        cssIdentifier: '[hash:base64]',
    }),
    mode: 'production',
    devtool: false,
};
