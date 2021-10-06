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
const EXTERNALS = ['web-worker', 'react-native-fetch-blob'];

console.log('[ ESBUILD ] internal.js');
esbuild.build({
    entryPoints: ['./src/suite_internal.ts'],
    outfile: 'dist/internal.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: false,
    sourcemap: true,
    external: EXTERNALS,
});

console.log('[ ESBUILD ] system-scan-int.js');
esbuild.build({
    entryPoints: ['./src/suite_system_scan_int.ts'],
    outfile: 'dist/system-scan-int.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: false,
    sourcemap: true,
    external: EXTERNALS,
});

console.log('[ ESBUILD ] system-scan-text.js');
esbuild.build({
    entryPoints: ['./src/suite_system_scan_text.ts'],
    outfile: 'dist/system-scan-text.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: false,
    sourcemap: true,
    external: EXTERNALS,
});

console.log('[ ESBUILD ] system-filter-text.js');
esbuild.build({
    entryPoints: ['./src/suite_system_filter_text.ts'],
    outfile: 'dist/system-filter-text.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: false,
    sourcemap: true,
    external: EXTERNALS,
});
