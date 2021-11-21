import fs from 'fs';
import path from 'path';

function printErr(err) {
    if (err) return console.log(err);
}

const DUCKDB_DIST = '../../packages/duckdb-wasm/dist/';
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-browser.mjs'), './duckdb-browser.mjs', printErr);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb.wasm'), './duckdb.wasm', printErr);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-next.wasm'), './duckdb-next.wasm', printErr);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-browser.worker.js'), './duckdb-browser.worker.js', printErr);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-browser-next.worker.js'), './duckdb-browser-next.worker.js', printErr);
