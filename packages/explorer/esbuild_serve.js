import esbuild from 'esbuild';
import { DEFAULT_BUILD_SETTINGS, copy_static, clean_dist, bundle_css } from './esbuild_config.js';

clean_dist();
copy_static();
bundle_css();

const SERVER_HOST = '0.0.0.0';
const SERVER_PORT = 9001;

console.log(`Serving duckdb-explorer.js at ${SERVER_HOST}:${SERVER_PORT}`);
esbuild.serve(
    {
        port: 9001,
        host: '0.0.0.0',
        servedir: './dist',
    },
    DEFAULT_BUILD_SETTINGS,
);
