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

function printErr(err) {
    if (err) return console.log(err);
}

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

// -------------------------------
// Clear directory

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, 'dist');
mkdir.sync(dist);
rimraf.sync(`${dist}/*.wasm`);
rimraf.sync(`${dist}/*.d.ts`);
rimraf.sync(`${dist}/*.js`);
rimraf.sync(`${dist}/*.js.map`);

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
//    path.resolve(dist, 'duckdb-browser-next-coi.pthread.worker.js'),
//    printErr,
//);

// -------------------------------
// ESM

const TARGET = ['esnext'];
const EXTERNALS_ESM = ['apache-arrow', 'crypto', 'os', 'fs', 'path', 'fast-glob', 'wasm-feature-detect'];
const EXTERNALS_IIFE = [];
const EXTERNALS_CJS = EXTERNALS_ESM;

console.log('[ ESBUILD ] duckdb.mjs');
esbuild.build({
    entryPoints: ['./src/targets/duckdb.ts'],
    outfile: 'dist/duckdb.mjs',
    platform: 'neutral',
    format: 'esm',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: true,
    external: EXTERNALS_ESM,
});

// -------------------------------
// Browser

console.log('[ ESBUILD ] duckdb-browser.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb.ts'],
    outfile: 'dist/duckdb-browser.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'both' : true,
    external: EXTERNALS_IIFE,
});

console.log('[ ESBUILD ] duckdb-browser.worker.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser.worker.ts'],
    outfile: 'dist/duckdb-browser.worker.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'both' : true,
});

console.log('[ ESBUILD ] duckdb-browser-next.worker.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-next.worker.ts'],
    outfile: 'dist/duckdb-browser-next.worker.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'both' : true,
});

console.log('[ ESBUILD ] duckdb-browser-next-coi.worker.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-next-coi.worker.ts'],
    outfile: 'dist/duckdb-browser-next-coi.worker.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'both' : true,
});

console.log('[ ESBUILD ] duckdb-browser-next-coi.pthread.worker.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-next-coi.pthread.worker.ts'],
    outfile: 'dist/duckdb-browser-next-coi.pthread.worker.js',
    platform: 'browser',
    format: 'iife',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'both' : true,
});

console.log('[ ESBUILD ] duckdb-browser-blocking.js');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-browser-blocking.ts'],
    outfile: 'dist/duckdb-browser-blocking.js',
    platform: 'browser',
    format: 'iife',
    globalName: 'duckdb',
    target: TARGET,
    bundle: true,
    minify: true,
    define: { 'process.env.NODE_ENV': '"production"' },
    sourcemap: is_debug ? 'both' : true,
    external: EXTERNALS_IIFE,
});

// -------------------------------
// NODE

console.log('[ ESBUILD ] duckdb-node.cjs');
esbuild.build({
    entryPoints: ['./src/targets/duckdb.ts'],
    outfile: 'dist/duckdb-node.cjs',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'both' : true,
    external: EXTERNALS_CJS,
});

console.log('[ ESBUILD ] duckdb-node.worker.cjs');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-node.worker.ts'],
    outfile: 'dist/duckdb-node.worker.cjs',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'both' : true,
    external: EXTERNALS_CJS,
});

console.log('[ ESBUILD ] duckdb-node-next.worker.cjs');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-node-next.worker.ts'],
    outfile: 'dist/duckdb-node-next.worker.cjs',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'both' : true,
    external: EXTERNALS_CJS,
});

console.log('[ ESBUILD ] duckdb-node-blocking.cjs');
esbuild.build({
    entryPoints: ['./src/targets/duckdb-node-blocking.ts'],
    outfile: 'dist/duckdb-node-blocking.cjs',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'both' : true,
    external: EXTERNALS_CJS,
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
    sourcemap: is_debug ? 'both' : true,
});

console.log('[ ESBUILD ] tests-node.cjs');
esbuild.build({
    entryPoints: ['./test/index_node.ts'],
    outfile: 'dist/tests-node.cjs',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: true,
    sourcemap: is_debug ? 'both' : true,
    // web-worker polyfill needs to be excluded from bundling due to their dynamic require messing with bundled modules
    external: [...EXTERNALS_CJS, 'web-worker'],
});

// -------------------------------
// Write declaration files

// ESM declarations
fs.writeFile(path.join(dist, 'duckdb.d.ts'), "export * from './types/src/targets/duckdb';", printErr);

// Browser declarations
fs.writeFile(path.join(dist, 'duckdb-browser.d.ts'), "export * from './types/src/targets/duckdb';", printErr);
fs.writeFile(path.join(dist, 'duckdb-browser-next.d.ts'), "export * from './types/src/targets/duckdb';", printErr);
fs.writeFile(path.join(dist, 'duckdb-browser-next-coi.d.ts'), "export * from './types/src/targets/duckdb';", printErr);
fs.writeFile(
    path.join(dist, 'duckdb-browser-blocking.d.ts'),
    "export * from './types/src/targets/duckdb-browser-blocking';",
    printErr,
);

// Node declarations
fs.writeFile(path.join(dist, 'duckdb-node.d.ts'), "export * from './types/src/targets/duckdb';", printErr);
fs.writeFile(path.join(dist, 'duckdb-node-next.d.ts'), "export * from './types/src/targets/duckdb';", printErr);
fs.writeFile(path.join(dist, 'duckdb-node-next-coi.d.ts'), "export * from './types/src/targets/duckdb';", printErr);
fs.writeFile(
    path.join(dist, 'duckdb-node-blocking.d.ts'),
    "export * from './types/src/targets/duckdb-node-blocking';",
    printErr,
);
