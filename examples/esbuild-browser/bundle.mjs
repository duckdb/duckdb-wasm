import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const DUCKDB_DIST = path.dirname(require.resolve('@duckdb/duckdb-wasm'));

function printErr(err) {
    if (err) return console.log(err);
}

fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-base.wasm'), './duckdb-base.wasm', printErr);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-threads.wasm'), './duckdb-threads.wasm', printErr);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-browser-base.worker.js'), './duckdb-browser-base.worker.js', printErr);
fs.copyFile(
    path.resolve(DUCKDB_DIST, 'duckdb-browser-base.worker.js.map'),
    './duckdb-browser-base.worker.js.map',
    printErr,
);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-browser-threads.worker.js'), './duckdb-browser-threads.worker.js', printErr);
fs.copyFile(
    path.resolve(DUCKDB_DIST, 'duckdb-browser-threads.worker.js.map'),
    './duckdb-browser-threads.worker.js.map',
    printErr,
);
fs.copyFile(
    path.resolve(DUCKDB_DIST, 'duckdb-browser-threads.pthread.worker.js'),
    './duckdb-browser-threads.pthread.worker.js',
    printErr,
);
fs.copyFile(
    path.resolve(DUCKDB_DIST, 'duckdb-browser-threads.pthread.worker.js.map'),
    './duckdb-browser-threads.pthread.worker.js.map',
    printErr,
);

esbuild.build({
    entryPoints: ['./index.ts'],
    outfile: 'index.js',
    platform: 'browser',
    format: 'iife',
    target: 'esnext',
    bundle: true,
    minify: false,
    sourcemap: false,
});
