// Copyright (c) 2020 The DashQL Authors

import fs from 'fs';

const pkgPaths = [
    './packages/duckdb-wasm-app/package.json',
    './packages/duckdb-wasm-shell/package.json',
    './packages/duckdb-wasm/package.json',
    './packages/benchmarks/package.json',
    './examples/esbuild-browser/package.json',
    './examples/esbuild-node/package.json',
    './examples/bare-node/package.json',
    './examples/bare-browser/package.json',
];
const pkgs = [];

// Read all packages
for (const pkgPath of pkgPaths) {
    const j = JSON.parse(fs.readFileSync(pkgPath));
    console.log(`${j.name}:${j.version}`);
    pkgs.push({
        path: pkgPath,
        name: j.name,
        version: j.version,
        config: j,
    });
}

// Do a naive n*n sync
for (const pkg of pkgs) {
    for (const otherPkg of pkgs) {
        if (pkg.name == otherPkg.name) continue;
        if (pkg.config.dependencies && pkg.config.dependencies[otherPkg.name] !== undefined) {
            pkg.config.dependencies[otherPkg.name] = `^${otherPkg.config.version}`;
        }
    }
    fs.writeFileSync(pkg.path, JSON.stringify(pkg.config, null, 4) + '\n');
}
