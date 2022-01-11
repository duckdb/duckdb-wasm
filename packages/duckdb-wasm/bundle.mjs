import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import mkdir from 'make-dir';
import { fileURLToPath } from 'url';

// -------------------------------
// Current bundling strategy
//
// We actually aim to be an ESM-only package but thats not possible for several reasons today.
//
// A) Karma does not support esm tests which has the following consequences:
// A.1) tests-browser.js needs to be an iife
// A.2) The worker scripts need to stay a iife since Karma can't import them otherwise (import.meta.url)
// B) Users that bundle our main modules might not want to also bundle our workers themselves, therefore:
// B.1) The workers remain self-contained iife and don't need to be bundled.
// B.2) That also allows us to host the iife workers on jsdelivr/unpkg.
// C) On node, we dynamically require "stream" (via apache-arrow) so node bundles have to stay commonjs for now.
//
// Bundles:
//   duckdb-browser.mjs                           - ESM Default Browser Bundle
//   duckdb-browser-blocking.mjs                  - ESM Blocking Browser Bundle (synchronous API, unstable)
//   duckdb-browser.worker.js                     - IIFE Web Worker for Wasm MVP
//   duckdb-browser-eh.worker.js                - IIFE Web Worker with Wasm EH
//   duckdb-browser-coi.worker.js            - IIFE Web Worker with Wasm EH + COI
//   duckdb-browser-coi.pthread.worker.js    - IIFE PThread Worker with Wasm EH + COI
//   duckdb-node.cjs                              - CommonJS Default Node Bundle
//   duckdb-node-blocking.cjs                     - CommonJS Blocking Node Bundle (synchronous API, unstable)
//   duckdb-node.worker.cjs                       - CommonJS Worker for Wasm MVP
//   duckdb-node-eh.worker.cjs                  - CommonJS Worker with Wasm EH
//   tests-browser.js                             - IIFE Jasmine Karma tests
//   tests-node.cjs                               - CommonJS Jasmine Node tests
//
// The lack of alternatives for Karma won't allow us to bundle workers and tests as ESM.
// We should upgrade all CommonJS bundles to ESM as soon as the dynamic requires are resolved.

const TARGET_BROWSER = ['chrome64', 'edge79', 'firefox62', 'safari11.1'];
const TARGET_BROWSER_TEST = ['es2020'];
const TARGET_NODE = ['node14.6'];
const EXTERNALS_NODE = ['apache-arrow'];
const EXTERNALS_BROWSER = []; // TODO(ankoh): readd apache-arrow when their exports are fixed
const EXTERNALS_WEBWORKER = [];

// Read CLI flags
let is_debug = false;
let args = process.argv.slice(2);
if (args.length == 0) {
    console.warn('Usage: node bundle.mjs {debug/release}');
} else {
    if (args[0] == 'debug') is_debug = true;
}
console.log(`DEBUG=${is_debug}`);
function printErr(err) {
    if (err) return console.log(err);
}

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

// -------------------------------
// Cleanup output directory

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, 'dist');
mkdir.sync(dist);
rimraf.sync(`${dist}/*.wasm`);
rimraf.sync(`${dist}/*.d.ts`);
rimraf.sync(`${dist}/*.js`);
rimraf.sync(`${dist}/*.js.map`);
rimraf.sync(`${dist}/*.mjs`);
rimraf.sync(`${dist}/*.mjs.map`);
rimraf.sync(`${dist}/*.cjs`);
rimraf.sync(`${dist}/*.cjs.map`);

// -------------------------------
// Copy WASM files

const src = path.resolve(__dirname, 'src');
fs.copyFile(path.resolve(src, 'bindings', 'duckdb.wasm'), path.resolve(dist, 'duckdb.wasm'), printErr);
fs.copyFile(path.resolve(src, 'bindings', 'duckdb-eh.wasm'), path.resolve(dist, 'duckdb-eh.wasm'), printErr);
fs.copyFile(path.resolve(src, 'bindings', 'duckdb-coi.wasm'), path.resolve(dist, 'duckdb-coi.wasm'), printErr);

// -------------------------------
// Browser bundles

console.log('[ ESBUILD ] duckdb-browser.cjs');
esbuild.build({
    entryPoints: ['./src/targets/duckdb.ts'],
    outfile: 'dist/duckdb-browser.cjs',
    platform: 'browser',
    format: 'cjs',
    target: TARGET_BROWSER,
    bundle: true,
    minify: false,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS_BROWSER,
    define: { 'process.release.name': '"browser"' },
});

console.log('[ ESBUILD ] duckdb-browser.mjs');
esbuild.build({
    entryPoints: ['./src/targets/duckdb.ts'],
    outfile: 'dist/duckdb-browser.mjs',
    platform: 'browser',
    format: 'esm',
    globalName: 'duckdb',
    target: TARGET_BROWSER,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS_BROWSER,
    define: { 'process.release.name': '"browser"' },
});

console.log('[ ESBUILD ] duckdb-browser-blocking.cjs');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-blocking.ts'],
    outfile: 'dist/duckdb-browser-blocking.cjs',
    platform: 'browser',
    format: 'cjs',
    target: TARGET_BROWSER,
    bundle: true,
    minify: false,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS_BROWSER,
    define: {
        'process.release.name': '"browser"',
        'process.env.NODE_ENV': '"production"',
    },
});

console.log('[ ESBUILD ] duckdb-browser-blocking.mjs');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-blocking.ts'],
    outfile: 'dist/duckdb-browser-blocking.mjs',
    platform: 'browser',
    format: 'esm',
    target: TARGET_BROWSER,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS_BROWSER,
    define: {
        'process.release.name': '"browser"',
        'process.env.NODE_ENV': '"production"',
    },
});

console.log('[ ESBUILD ] duckdb-browser.worker.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser.worker.ts'],
    outfile: 'dist/duckdb-browser.worker.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET_BROWSER,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS_WEBWORKER,
    define: { 'process.release.name': '"browser"' },
});

console.log('[ ESBUILD ] duckdb-browser-eh.worker.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-eh.worker.ts'],
    outfile: 'dist/duckdb-browser-eh.worker.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET_BROWSER,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS_WEBWORKER,
    define: { 'process.release.name': '"browser"' },
});

console.log('[ ESBUILD ] duckdb-browser-coi.worker.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-coi.worker.ts'],
    outfile: 'dist/duckdb-browser-coi.worker.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET_BROWSER,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS_WEBWORKER,
    define: { 'process.release.name': '"browser"' },
});

console.log('[ ESBUILD ] duckdb-browser-coi.pthread.worker.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-coi.pthread.worker.ts'],
    outfile: 'dist/duckdb-browser-coi.pthread.worker.js',
    platform: 'browser',
    format: 'iife',
    target: TARGET_BROWSER,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS_WEBWORKER,
    define: { 'process.release.name': '"browser"' },
});

// -------------------------------
// Node bundles

console.log('[ ESBUILD ] duckdb-node.cjs');
esbuild.build({
    entryPoints: ['./src/targets/duckdb.ts'],
    outfile: 'dist/duckdb-node.cjs',
    platform: 'node',
    format: 'cjs',
    globalName: 'duckdb',
    target: TARGET_NODE,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS_NODE,
});

console.log('[ ESBUILD ] duckdb-node-blocking.cjs');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-node-blocking.ts'],
    outfile: 'dist/duckdb-node-blocking.cjs',
    platform: 'node',
    format: 'cjs',
    target: TARGET_NODE,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS_NODE,
});

console.log('[ ESBUILD ] duckdb-node.worker.mjs');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-node.worker.ts'],
    outfile: 'dist/duckdb-node.worker.cjs',
    platform: 'node',
    format: 'cjs',
    target: TARGET_NODE,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS_NODE,
});

console.log('[ ESBUILD ] duckdb-node-eh.worker.cjs');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-node-eh.worker.ts'],
    outfile: 'dist/duckdb-node-eh.worker.cjs',
    platform: 'node',
    format: 'cjs',
    target: TARGET_NODE,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS_NODE,
});

// -------------------------------
// Test bundles

console.log('[ ESBUILD ] tests-browser.js');
esbuild.build({
    entryPoints: ['./test/index_browser.ts'],
    outfile: 'dist/tests-browser.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET_BROWSER_TEST,
    bundle: true,
    sourcemap: is_debug ? 'inline' : true,
});

console.log('[ ESBUILD ] tests-node.cjs');
esbuild.build({
    entryPoints: ['./test/index_node.ts'],
    outfile: 'dist/tests-node.cjs',
    platform: 'node',
    format: 'cjs',
    target: TARGET_NODE,
    bundle: true,
    minify: false,
    sourcemap: is_debug ? 'inline' : true,
    // web-worker polyfill needs to be excluded from bundling due to their dynamic require messing with bundled modules
    external: [...EXTERNALS_NODE, 'web-worker'],
});

// -------------------------------
// Write declaration files

// Browser declarations
fs.writeFile(path.join(dist, 'duckdb-browser.d.ts'), "export * from './types/src/targets/duckdb';", printErr);
fs.writeFile(path.join(dist, 'duckdb-browser-eh.d.ts'), "export * from './types/src/targets/duckdb';", printErr);
fs.writeFile(path.join(dist, 'duckdb-browser-coi.d.ts'), "export * from './types/src/targets/duckdb';", printErr);
fs.writeFile(
    path.join(dist, 'duckdb-browser-blocking.d.ts'),
    "export * from './types/src/targets/duckdb-browser-blocking';",
    printErr,
);

// Node declarations
fs.writeFile(path.join(dist, 'duckdb-node.d.ts'), "export * from './types/src/targets/duckdb';", printErr);
fs.writeFile(path.join(dist, 'duckdb-node-eh.d.ts'), "export * from './types/src/targets/duckdb';", printErr);
fs.writeFile(path.join(dist, 'duckdb-node-coi.d.ts'), "export * from './types/src/targets/duckdb';", printErr);
fs.writeFile(
    path.join(dist, 'duckdb-node-blocking.d.ts'),
    "export * from './types/src/targets/duckdb-node-blocking';",
    printErr,
);
