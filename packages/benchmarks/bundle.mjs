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
const dist = path.resolve(__dirname, 'dist', 'node');
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
const EXTERNALS = ['web-worker', 'react-native-fetch-blob'];

console.log('[ ESBUILD ] bench-internal-node.js');
esbuild.build({
    entryPoints: ['./src/internal_node.ts'],
    outfile: 'dist/node/bench-internal-node.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: false,
    sourcemap: 'both',
    external: EXTERNALS,
});

console.log('[ ESBUILD ] bench-system-node.js');
esbuild.build({
    entryPoints: ['./src/system_node.ts'],
    outfile: 'dist/node/bench-system-node.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: false,
    sourcemap: 'both',
    external: EXTERNALS,
});
