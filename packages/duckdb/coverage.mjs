import fs from 'fs';
import path from 'path';
import mkdir from 'make-dir';
import rimraf from 'rimraf';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const cov = path.resolve(__dirname, 'coverage');
const cov_chrome = path.resolve(cov, 'chrome', 'coverage-final.json');
//const cov_firefox = path.resolve(cov, 'firefox', 'coverage-final.json');
const cov_node = path.resolve(cov, 'node', 'coverage-final.json');
const cov_all = path.resolve(cov, 'all');
const cov_out = path.resolve(cov, 'coverage.json');
const nyc = '../../node_modules/nyc/bin/nyc.js';

rimraf.sync(cov_all);
mkdir.sync(cov_all);
fs.copyFileSync(cov_chrome, path.resolve(cov_all, 'chrome.json'));
//fs.copyFileSync(cov_firefox, path.resolve(cov_all, 'firefox.json'));
fs.copyFileSync(cov_node, path.resolve(cov_all, 'node.json'));

const out = spawnSync(nyc, ['merge', cov_all, cov_out], {
    encoding: 'utf8',
    shell: true,
    cov,
});
console.log(out.stdout);
if (out.status !== 0) {
    console.error(out.stderr);
    process.exit(out.status);
}
