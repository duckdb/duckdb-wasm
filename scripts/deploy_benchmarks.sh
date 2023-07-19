#!/usr/bin/env bash

set -ex

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null
PAGES=${PROJECT_ROOT}/worktrees/gh-pages

mkdir -p ${PROJECT_ROOT}/worktrees
if [ ! -d ${PAGES} ]; then
    echo "[ RUN ] Add worktree origin/gh-pages"
    git worktree add ${PAGES} origin/gh-pages
fi

cd ${PAGES}
git fetch origin gh-pages
git reset --hard origin/gh-pages

mkdir -p data
cp -r ${PROJECT_ROOT}/reports/benchmarks.arrow ./data/benchmarks.arrow
cp -r ${PROJECT_ROOT}/duckdb/benchmarks.json ./data/benchmarks.json
cp -r ${PROJECT_ROOT}/duckdb/benchmarks.csv ./data/benchmarks.csv

git add ./data/benchmarks.arrow
git commit --amend -m "Update benchmarks"
git push origin HEAD:gh-pages --force
