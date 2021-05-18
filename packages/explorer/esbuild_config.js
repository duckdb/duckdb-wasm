import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import mkdir from 'make-dir';
import { fileURLToPath } from 'url';

function printErr(err) {
    if (err) return console.log(err);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist_dir = path.resolve(__dirname, 'dist');

// Clean build directory
export function clean_dist() {
    mkdir.sync(dist_dir);
    rimraf.sync(dist_dir + '/*.html');
    rimraf.sync(dist_dir + '/*.wasm');
    rimraf.sync(dist_dir + '/*.js');
    rimraf.sync(dist_dir + '/*.js.map');
}

// Copy static files
export function copy_static() {
    const static_dir = path.resolve(__dirname, 'static');
    fs.copyFile(path.resolve(static_dir, 'index.html'), path.resolve(dist_dir, 'index.html'), printErr);
}

export const DEFAULT_BUILD_SETTINGS = {
    entryPoints: ['./src/embed.tsx'],
    outfile: './dist/duckdb-explorer.js',
    platform: 'browser',
    format: 'iife',
    target: 'es6',
    bundle: true,
    minify: true,
    sourcemap: 'external',
    define: { 'process.env.NODE_ENV': '"production"' },
    globalName: 'DuckDBExplorer',
};
export default DEFAULT_BUILD_SETTINGS;
