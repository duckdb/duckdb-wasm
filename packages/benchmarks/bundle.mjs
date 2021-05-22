import esbuild from 'esbuild';
import path from 'path';
import mkdir from 'make-dir';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Bundling node is a bit problematic right now.
// The web worker ponyfill is commonjs (dynamic require) and prevents us from releasing an async node module.

function printErr(err) {
    if (err) return console.log(err);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, 'dist');
mkdir.sync(dist);

// -------------------------------
// Copy WASM files

fs.copyFile(
    path.resolve(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm'),
    path.resolve(dist, 'sql-wasm.wasm'),
    printErr,
);

// -------------------------------
// ESM

const TARGET = 'es2020';

console.log('[ ESBUILD ] bench-node.js');
esbuild.build({
    entryPoints: ['./src/index_node.ts'],
    outfile: 'dist/bench-node.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: false,
    sourcemap: 'both',
    // web-worker polyfill needs to be excluded from bundling due to their dynamic require messing with bundled modules
    external: ['web-worker', 'alasql'],
});
