import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import mkdir from 'make-dir';
import { fileURLToPath } from 'url';

let is_debug = false;
let args = process.argv.slice(2);
if (args.length == 0) {
    console.warn('Usage: node bundle.mjs {debug/release}');
} else {
    if (args[0] == 'debug') is_debug = true;
}
console.log(`DEBUG=${is_debug}`);

// Bundling node is a bit problematic right now.
// The web worker ponyfill is commonjs (dynamic require) and prevents us from releasing an async node module.

function printErr(err) {
    if (err) return console.log(err);
}

// -------------------------------
// Clear directory

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, 'dist');
mkdir.sync(dist);
rimraf.sync(dist + '/*.wasm');
rimraf.sync(dist + '/*.d.ts');
rimraf.sync(dist + '/*.js');
rimraf.sync(dist + '/*.js.map');

// -------------------------------
// Copy WASM files

const src = path.resolve(__dirname, 'src');
fs.copyFile(path.resolve(src, 'bindings', 'duckdb_wasm.wasm'), path.resolve(dist, 'duckdb.wasm'), printErr);
fs.copyFile(path.resolve(src, 'bindings', 'duckdb_wasm_next.wasm'), path.resolve(dist, 'duckdb-next.wasm'), printErr);
fs.copyFile(
    path.resolve(src, 'bindings', 'duckdb_wasm_next_coi.wasm'),
    path.resolve(dist, 'duckdb-next-coi.wasm'),
    printErr,
);
//fs.copyFile(
//    path.resolve(src, 'bindings', 'duckdb_wasm_next_coi.pthread.js'),
//    path.resolve(dist, 'duckdb-browser-async-next-coi.pthread.worker.js'),
//    printErr,
//);

// -------------------------------
// ESM

const TARGET = ['esnext'];
const EXTERNALS = ['apache-arrow', 'crypto', 'os', 'fs', 'path', 'fast-glob', 'wasm-feature-detect'];

console.log('[ ESBUILD ] duckdb.module.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb.module.ts'],
    entryNames: '[name]',
    outdir: './dist',
    platform: 'neutral',
    format: 'esm',
    target: TARGET,
    splitting: true,
    bundle: true,
    minify: true,
    sourcemap: true,
    external: EXTERNALS,
});

// -------------------------------
// Browser

console.log('[ ESBUILD ] duckdb-browser-sync.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-sync.ts'],
    outfile: 'dist/duckdb-browser-sync.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET,
    bundle: true,
    minify: true,
    define: { 'process.env.NODE_ENV': '"production"' },
    sourcemap: is_debug ? 'inline' : true,
});

console.log('[ ESBUILD ] duckdb-browser-sync-next.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-sync-next.ts'],
    outfile: 'dist/duckdb-browser-sync-next.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET,
    bundle: true,
    minify: true,
    define: { 'process.env.NODE_ENV': '"production"' },
    sourcemap: is_debug ? 'inline' : true,
});

console.log('[ ESBUILD ] duckdb-browser-async.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-async.ts'],
    outfile: 'dist/duckdb-browser-async.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
});

console.log('[ ESBUILD ] duckdb-browser-async.worker.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-async.worker.ts'],
    outfile: 'dist/duckdb-browser-async.worker.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
});

console.log('[ ESBUILD ] duckdb-browser-async-next.worker.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-async-next.worker.ts'],
    outfile: 'dist/duckdb-browser-async-next.worker.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
});

console.log('[ ESBUILD ] duckdb-browser-async-next-coi.worker.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-async-next-coi.worker.ts'],
    outfile: 'dist/duckdb-browser-async-next-coi.worker.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
});

console.log('[ ESBUILD ] duckdb-browser-async-next-coi.pthread.worker.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-async-next-coi.pthread.worker.ts'],
    outfile: 'dist/duckdb-browser-async-next-coi.pthread.worker.js',
    platform: 'browser',
    format: 'iife',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
});

// -------------------------------
// NODE

console.log('[ ESBUILD ] duckdb-node-sync.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-node-sync.ts'],
    outfile: 'dist/duckdb-node-sync.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS,
});

console.log('[ ESBUILD ] duckdb-node-sync-next.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-node-sync-next.ts'],
    outfile: 'dist/duckdb-node-sync-next.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS,
});

console.log('[ ESBUILD ] duckdb-node-async.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-node-async.ts'],
    outfile: 'dist/duckdb-node-async.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS,
});

console.log('[ ESBUILD ] duckdb-node-async.worker.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-node-async.worker.ts'],
    outfile: 'dist/duckdb-node-async.worker.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS,
});

console.log('[ ESBUILD ] duckdb-node-async-next.worker.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-node-async-next.worker.ts'],
    outfile: 'dist/duckdb-node-async-next.worker.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS,
});

// -------------------------------
// Tests

console.log('[ ESBUILD ] tests-browser.js');
esbuild.build({
    entryPoints: ['./test/index_browser.ts'],
    outfile: 'dist/tests-browser.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET,
    bundle: true,
    sourcemap: is_debug ? 'inline' : true,
});

console.log('[ ESBUILD ] tests-node.js');
esbuild.build({
    entryPoints: ['./test/index_node.ts'],
    outfile: 'dist/tests-node.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
    // web-worker polyfill needs to be excluded from bundling due to their dynamic require messing with bundled modules
    external: [...EXTERNALS, 'web-worker'],
});

// -------------------------------
// Write declaration files

// ESM declarations
fs.writeFile(path.join(dist, 'duckdb.module.d.ts'), "export * from './types/src/';", printErr);

// Browser declarations
fs.writeFile(
    path.join(dist, 'duckdb-browser-sync.d.ts'),
    "export * from './types/src/targets/duckdb-browser-sync';",
    printErr,
);
fs.writeFile(
    path.join(dist, 'duckdb-browser-sync-next.d.ts'),
    "export * from './types/src/targets/duckdb-browser-sync-next';",
    printErr,
);
fs.writeFile(
    path.join(dist, 'duckdb-browser-async.d.ts'),
    "export * from './types/src/targets/duckdb-browser-async';",
    printErr,
);
fs.writeFile(
    path.join(dist, 'duckdb-browser-async-next.d.ts'),
    "export * from './types/src/targets/duckdb-browser-async-next';",
    printErr,
);
fs.writeFile(
    path.join(dist, 'duckdb-browser-async-next-coi.d.ts'),
    "export * from './types/src/targets/duckdb-browser-async-next-coi';",
    printErr,
);

// Node declarations
fs.writeFile(
    path.join(dist, 'duckdb-node-sync.d.ts'),
    "export * from './types/src/targets/duckdb-node-sync';",
    printErr,
);
fs.writeFile(
    path.join(dist, 'duckdb-node-sync-next.d.ts'),
    "export * from './types/src/targets/duckdb-node-sync-next';",
    printErr,
);
fs.writeFile(
    path.join(dist, 'duckdb-node-async.d.ts'),
    "export * from './types/src/targets/duckdb-node-async';",
    printErr,
);
