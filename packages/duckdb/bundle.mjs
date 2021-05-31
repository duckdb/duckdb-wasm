import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import mkdir from 'make-dir';
import { fileURLToPath } from 'url';

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
rimraf.sync(dist + '/*.js');
rimraf.sync(dist + '/*.js.map');

// -------------------------------
// Copy WASM files

const src = path.resolve(__dirname, 'src');
fs.copyFile(path.resolve(src, 'bindings', 'duckdb_wasm.wasm'), path.resolve(dist, 'duckdb.wasm'), printErr);
fs.copyFile(path.resolve(src, 'bindings', 'duckdb_wasm_eh.wasm'), path.resolve(dist, 'duckdb-eh.wasm'), printErr);
fs.copyFile(path.resolve(src, 'bindings', 'duckdb_wasm_eh_mt.wasm'), path.resolve(dist, 'duckdb-eh-mt.wasm'), printErr);

// -------------------------------
// ESM

const TARGET = 'es2020';
const EXTERNALS = ['apache-arrow', 'crypto', 'os', 'fs', 'path', 'fast-glob'];

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
    sourcemap: 'external',
    external: EXTERNALS,
});

// -------------------------------
// Browser

console.log('[ ESBUILD ] duckdb-browser.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-sync.ts'],
    outfile: 'dist/duckdb-browser.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET,
    bundle: true,
    minify: true,
    define: { 'process.env.NODE_ENV': '"production"' },
    sourcemap: 'external',
});

console.log('[ ESBUILD ] duckdb-browser-eh.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-sync-eh.ts'],
    outfile: 'dist/duckdb-browser-eh.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET,
    bundle: true,
    minify: true,
    define: { 'process.env.NODE_ENV': '"production"' },
    sourcemap: 'external',
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
    sourcemap: 'external',
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
    sourcemap: 'external',
});

console.log('[ ESBUILD ] duckdb-browser-async-eh.worker.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-async-eh.worker.ts'],
    outfile: 'dist/duckdb-browser-async-eh.worker.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: 'external',
});

console.log('[ ESBUILD ] duckdb-browser-async-eh-mt.worker.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-async-eh-mt.worker.ts'],
    outfile: 'dist/duckdb-browser-async-eh-mt.worker.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: 'external',
});

// -------------------------------
// NODE

console.log('[ ESBUILD ] duckdb-node-eh.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-node-sync-eh.ts'],
    outfile: 'dist/duckdb-node.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: 'external',
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
    sourcemap: 'external',
    external: EXTERNALS,
});

console.log('[ ESBUILD ] duckdb-node-async-eh.worker.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-node-async-eh.worker.ts'],
    outfile: 'dist/duckdb-node-async-eh.worker.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: 'external',
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
    minify: true,
    sourcemap: 'both',
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
    sourcemap: 'external',
    // web-worker polyfill needs to be excluded from bundling due to their dynamic require messing with bundled modules
    external: [...EXTERNALS, 'web-worker'],
});

// -------------------------------
// Write declaration files

// ESM declarations
fs.writeFile(path.join(dist, 'duckdb.module.d.ts'), "export * from './types/src/';", printErr);

// Browser declarations
fs.writeFile(
    path.join(dist, 'duckdb-browser.d.ts'),
    "export * from './types/src/targets/duckdb-browser-sync';",
    printErr,
);
fs.writeFile(
    path.join(dist, 'duckdb-browser-eh.d.ts'),
    "export * from './types/src/targets/duckdb-browser-sync-eh';",
    printErr,
);
fs.writeFile(
    path.join(dist, 'duckdb-browser-async.d.ts'),
    "export * from './types/src/targets/duckdb-browser-async';",
    printErr,
);
fs.writeFile(
    path.join(dist, 'duckdb-browser-async-eh.d.ts'),
    "export * from './types/src/targets/duckdb-browser-async-eh';",
    printErr,
);
fs.writeFile(
    path.join(dist, 'duckdb-browser-async-eh-mt.d.ts'),
    "export * from './types/src/targets/duckdb-browser-async-eh-mt';",
    printErr,
);

// Node declarations
fs.writeFile(
    path.join(dist, 'duckdb-node-sync-eh.d.ts'),
    "export * from './types/src/targets/duckdb-node-sync-eh';",
    printErr,
);
fs.writeFile(
    path.join(dist, 'duckdb-node-async.d.ts'),
    "export * from './types/src/targets/duckdb-node-async';",
    printErr,
);
