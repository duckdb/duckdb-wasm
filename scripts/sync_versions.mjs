// Copyright (c) 2020 The DashQL Authors

import path from 'path';
import fs from 'fs';

const pkgNames = ['duckdb', 'benchmarks', 'explorer'];
const pkgs = new Map();

// Read all packages
for (const name of pkgNames) {
    const p = path.join('packages', name, 'package.json');
    const j = JSON.parse(fs.readFileSync(p));
    console.log(`${j.name}:${j.version}`);
    pkgs.set(j.name, {
        name,
        path: p,
        config: j,
        version: j.version,
    });
}

// Do a naive n*n sync
for (const [name, pkg] of pkgs) {
    for (const [otherName, otherPkg] of pkgs) {
        if (name == otherName) continue;
        if (pkg.config.dependencies && pkg.config.dependencies[otherName] !== undefined) {
            pkg.config.dependencies[otherName] = `^${otherPkg.config.version}`;
        }
    }
    fs.writeFileSync(pkg.path, JSON.stringify(pkg.config, null, 4) + '\n');
}
