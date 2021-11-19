import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

function printErr(err) {
    if (err) return console.log(err);
}

const DUCKDB_DIST = '../../packages/duckdb-wasm/dist/';
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb.wasm'), './duckdb.wasm', printErr);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-next.wasm'), './duckdb-next.wasm', printErr);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-browser.worker.js'), './duckdb-browser.worker.js', printErr);
fs.copyFile(path.resolve(DUCKDB_DIST, 'duckdb-browser-next.worker.js'), './duckdb-browser-next.worker.js', printErr);

// -------------------------------
// Patch broken arrow package.json
// XXX Remove this hack as soon as arrow fixes the exports
function patch_arrow() {
    const package_path = '../../node_modules/apache-arrow/package.json';
    const package_raw = fs.readFileSync(package_path);
    const package_json = JSON.parse(package_raw);
    package_json.exports = {
        node: {
            import: './Arrow.node.mjs',
            require: './Arrow.node.js',
        },
        import: './Arrow.dom.mjs',
        default: './Arrow.dom.js',
    };
    fs.writeFileSync(package_path, JSON.stringify(package_json));
}
patch_arrow();

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
