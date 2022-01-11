import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const DUCKDB_DIST = path.dirname(require.resolve('@duckdb/duckdb-wasm'));

function printErr(err) {
    if (err) return console.log(err);
}

fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-browser.mjs'), './duckdb-browser.mjs', printErr);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb.wasm'), './duckdb.wasm', printErr);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-eh.wasm'), './duckdb-eh.wasm', printErr);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-browser.worker.js'), './duckdb-browser.worker.js', printErr);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-browser-eh.worker.js'), './duckdb-browser-eh.worker.js', printErr);
