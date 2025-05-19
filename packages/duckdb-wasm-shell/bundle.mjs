import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { rimrafSync } from 'rimraf';
import mkdir from 'make-dir';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TARGET_BROWSER = ['chrome64', 'edge79', 'firefox62', 'safari11.1'];
const EXTERNALS_BROWSER = [
    '@motherduck/duckdb-wasm',
    'xterm',
    'xterm-addon-fit',
    'xterm-addon-web-links',
    'xterm-addon-webgl',
];

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

// -------------------------------
// Wasm plugin

const mode = is_debug ? '--debug' : '--release';
execSync(`wasm-pack build --target web --out-dir ./pkg --out-name shell ${mode}`, {
    cwd: path.join(__dirname, 'crate'),
    stdio: 'inherit',
});

// -------------------------------
// Cleanup output directory

const dist = path.resolve(__dirname, 'dist');
mkdir.sync(dist);
rimrafSync(`${dist}/*.wasm`);
rimrafSync(`${dist}/*.d.ts`);
rimrafSync(`${dist}/*.js`);
rimrafSync(`${dist}/*.js.map`);
rimrafSync(`${dist}/*.mjs`);
rimrafSync(`${dist}/*.mjs.map`);
rimrafSync(`${dist}/*.cjs`);
rimrafSync(`${dist}/*.cjs.map`);

// -------------------------------
// Copy WASM files

const crate_pkg = path.resolve(__dirname, 'crate', 'pkg');
fs.copyFile(path.resolve(crate_pkg, 'shell_bg.wasm'), path.resolve(dist, 'shell_bg.wasm'), printErr);

// -------------------------------
// Browser bundles

console.log('[ ESBUILD ] shell.mjs');
esbuild.build({
    entryPoints: ['./src/index.ts'],
    outfile: 'dist/shell.mjs',
    platform: 'browser',
    format: 'esm',
    globalName: 'duckdb',
    target: TARGET_BROWSER,
    bundle: true,
    minify: false,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS_BROWSER,
});

console.log('[ ESBUILD ] shell.cjs');
esbuild.build({
    entryPoints: ['./src/index.ts'],
    outfile: 'dist/shell.cjs',
    platform: 'browser',
    format: 'cjs',
    target: TARGET_BROWSER,
    bundle: true,
    minify: false,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS_BROWSER,
});

console.log('[ ESBUILD ] shell.js');
esbuild.build({
    entryPoints: ['./src/index.ts'],
    outfile: 'dist/shell.js',
    platform: 'browser',
    format: 'iife',
    target: TARGET_BROWSER,
    bundle: true,
    minify: false,
    sourcemap: is_debug ? 'inline' : true,
    external: EXTERNALS_BROWSER,
});

// -------------------------------
// Write declaration files

fs.writeFile(path.join(dist, 'shell.d.ts'), "export * from './types/src/index';", printErr);
