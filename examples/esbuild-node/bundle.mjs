import esbuild from 'esbuild';

esbuild.build({
    entryPoints: ['./index.ts'],
    outfile: 'index.mjs',
    platform: 'node',
    format: 'esm',
    target: 'esnext',
    bundle: false,
    minify: false,
    sourcemap: false,
});
