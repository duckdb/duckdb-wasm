#!/usr/bin/env bash

set -ex

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null
PAGES_DIR=${PROJECT_ROOT}/worktrees/gh-pages

mkdir -p ${PROJECT_ROOT}/worktrees
if [ ! -d ${PAGES_DIR} ]; then
    echo "[ RUN ] Add worktree origin/gh-pages"
    git worktree add ${PAGES_DIR} origin/gh-pages
fi

DEFAULT_BRANCH="master"
CURRENT_BRANCH=${1:-master}

cd ${PAGES_DIR}
git fetch origin gh-pages
git reset --hard origin/gh-pages

if [ "${CURRENT_BRANCH}" = "${DEFAULT_BRANCH}" ]; then
    echo "[ RUN ] Install @duckdb/duckdb-wasm-shell to ${PAGES_DIR}/"

    find ${PAGES_DIR} \
        -mindepth 1 \
        -maxdepth 1 \
        -type d \
        -not -name branches \
        -not -name data \
        -exec echo rm -rf '{}' \;

    cp -r ${PROJECT_ROOT}/packages/duckdb-wasm-shell/build/release/* ${PAGES_DIR}
else
    TARGET_DIR="${PAGES_DIR}/branches/${CURRENT_BRANCH}"
    echo "[ RUN ] Install @duckdb/duckdb-wasm-shell to ${TARGET_DIR}/"

    rm -rf ${TARGET_DIR}
    mkdir -p ${PAGES_DIR}/branches
    cp -r ${PROJECT_ROOT}/packages/duckdb-wasm-shell/build/release ${TARGET_DIR}
fi

git add -A .
git commit --amend -m "Deploy web shell"
git push origin HEAD:gh-pages --force
