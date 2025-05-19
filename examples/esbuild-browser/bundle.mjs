import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const DUCKDB_DIST = path.dirname(require.resolve('@motherduck/duckdb-wasm'));

function printErr(err) {
    if (err) return console.log(err);
}

fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-mvp.wasm'), './duckdb-mvp.wasm', printErr);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-eh.wasm'), './duckdb-eh.wasm', printErr);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-coi.wasm'), './duckdb-coi.wasm', printErr);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-browser-mvp.worker.js'), './duckdb-browser-mvp.worker.js', printErr);
fs.copyFile(
    path.resolve(DUCKDB_DIST, 'duckdb-browser-mvp.worker.js.map'),
    './duckdb-browser-mvp.worker.js.map',
    printErr,
);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-browser-eh.worker.js'), './duckdb-browser-eh.worker.js', printErr);
fs.copyFile(
    path.resolve(DUCKDB_DIST, 'duckdb-browser-eh.worker.js.map'),
    './duckdb-browser-eh.worker.js.map',
    printErr,
);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-browser-coi.worker.js'), './duckdb-browser-coi.worker.js', printErr);
fs.copyFile(
    path.resolve(DUCKDB_DIST, 'duckdb-browser-coi.worker.js.map'),
    './duckdb-browser-coi.worker.js.map',
    printErr,
);
fs.copyFile(
    path.resolve(DUCKDB_DIST, 'duckdb-browser-coi.pthread.worker.js'),
    './duckdb-browser-coi.pthread.worker.js',
    printErr,
);
fs.copyFile(
    path.resolve(DUCKDB_DIST, 'duckdb-browser-coi.pthread.worker.js.map'),
    './duckdb-browser-coi.pthread.worker.js.map',
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
