import esbuild from 'esbuild';

esbuild.build({
    entryPoints: ['./index.ts'],
    outfile: 'index.cjs',
    platform: 'node',
    format: 'cjs',
    target: 'esnext',
    bundle: false,
    minify: false,
    sourcemap: false,
});
