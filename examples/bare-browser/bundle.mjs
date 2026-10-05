import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const DUCKDB_DIST = path.dirname(require.resolve('@duckdb/duckdb-wasm'));

function printErr(err) {
    if (err) return console.log(err);
}

fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-browser.mjs'), './duckdb-browser.mjs', printErr);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-base.wasm'), './duckdb-base.wasm', printErr);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-browser-base.worker.js'), './duckdb-browser-base.worker.js', printErr);
