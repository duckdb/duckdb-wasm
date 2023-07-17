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
const EXTERNALS = ['web-worker', 'react-native-fetch-blob', 'apache-arrow', 'buffalo-bench'];

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

console.log('[ ESBUILD ] system-sort-int.js');
esbuild.build({
    entryPoints: ['./src/suite_system_sort_int.ts'],
    outfile: 'dist/system-sort-int.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: false,
    sourcemap: true,
    external: EXTERNALS,
});

console.log('[ ESBUILD ] system-sum-int.js');
esbuild.build({
    entryPoints: ['./src/suite_system_sum_int.ts'],
    outfile: 'dist/system-sum-int.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: false,
    sourcemap: true,
    external: EXTERNALS,
});

console.log('[ ESBUILD ] system-sum-csv.js');
esbuild.build({
    entryPoints: ['./src/suite_system_sum_csv.ts'],
    outfile: 'dist/system-sum-csv.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: false,
    sourcemap: true,
    external: EXTERNALS,
});

console.log('[ ESBUILD ] system-regex.js');
esbuild.build({
    entryPoints: ['./src/suite_system_regex.ts'],
    outfile: 'dist/system-regex.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: false,
    sourcemap: true,
    external: EXTERNALS,
});

console.log('[ ESBUILD ] system-join-2.js');
esbuild.build({
    entryPoints: ['./src/suite_system_join_2.ts'],
    outfile: 'dist/system-join-2.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: false,
    sourcemap: true,
    external: EXTERNALS,
});

console.log('[ ESBUILD ] system-join-3.js');
esbuild.build({
    entryPoints: ['./src/suite_system_join_3.ts'],
    outfile: 'dist/system-join-3.js',
    platform: 'node',
    format: 'cjs',
    target: TARGET,
    bundle: true,
    minify: false,
    sourcemap: true,
    external: EXTERNALS,
});

for (const sys of ['arquero', 'duckdb', 'lovefield', 'sqljs']) {
    console.log(`[ ESBUILD ] system-tpch-${sys}.js`);
    esbuild.build({
        entryPoints: [`./src/suite_system_tpch_${sys}.ts`],
        outfile: `dist/system-tpch-${sys}.js`,
        platform: 'node',
        format: 'cjs',
        target: TARGET,
        bundle: true,
        minify: false,
        sourcemap: true,
        external: EXTERNALS,
    });
}
