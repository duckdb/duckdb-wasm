import esbuild from 'esbuild';
import { DEFAULT_BUILD_SETTINGS, copy_static, clean_dist, bundle_css } from './esbuild_config.js';

clean_dist();
copy_static();
bundle_css();

console.log(`Building duckdb-explorer.js`);
esbuild.build({
    ...DEFAULT_BUILD_SETTINGS,
    define: { 'process.env.NODE_ENV': '"production"' },
});
