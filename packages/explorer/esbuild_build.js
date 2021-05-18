import esbuild from 'esbuild';
import { DEFAULT_BUILD_SETTINGS, copy_static, clean_dist } from './esbuild_config.js';

clean_dist();
copy_static();

console.log(`Building duckdb-explorer.js`);
esbuild.build(DEFAULT_BUILD_SETTINGS);
