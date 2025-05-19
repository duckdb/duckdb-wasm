#!/usr/bin/env bash

set -ex

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null
PAGES_DIR=${PROJECT_ROOT}/worktrees/gh-pages

mkdir -p ${PROJECT_ROOT}/worktrees
if [ ! -d ${PAGES_DIR} ]; then
    echo "[ RUN ] Add worktree origin/gh-pages"
    git worktree add ${PAGES_DIR} origin/gh-pages
fi

DEFAULT_BRANCH="main"
CURRENT_BRANCH=${1:-main}

cd ${PAGES_DIR}
git fetch origin gh-pages
git reset --hard origin/gh-pages

if [ "${CURRENT_BRANCH}" = "${DEFAULT_BRANCH}" ]; then
    echo "[ RUN ] Install @motherduck/duckdb-wasm-app to ${PAGES_DIR}/"
    find ${PAGES_DIR} \
        -mindepth 1 \
        -maxdepth 1 \
        -type d \
        -not -name data \
        -not -name misc \
        -exec rm -rf '{}' \;
    cp -r ${PROJECT_ROOT}/packages/duckdb-wasm-app/build/release/* ${PAGES_DIR}

    echo "[ RUN ] Install @motherduck/duckdb-wasm typedocs to ${TARGET_DIR}/docs"
    rm -rf ${PAGES_DIR}/docs
    cp -r ${PROJECT_ROOT}/packages/duckdb-wasm/docs ${PAGES_DIR}/docs

    echo "[ RUN ] Install misc to ${TARGET_DIR}/misc"
    rm -rf ${PAGES_DIR}/misc
    mkdir -p ${PAGES_DIR}/misc
    cp -r ${PROJECT_ROOT}/misc/*.svg ${PAGES_DIR}/misc/
    cp -r ${PROJECT_ROOT}/misc/*.png ${PAGES_DIR}/misc/

    echo "[ RUN ] Install DuckDB version badge to ${TARGET_DIR}/misc"
    ${PROJECT_ROOT}/scripts/build_duckdb_badge.sh > ${PAGES_DIR}/misc/duckdb_version_badge.svg
else
    TARGET_DIR="${PAGES_DIR}/branches/${CURRENT_BRANCH}"
    echo "[ RUN ] Install @motherduck/duckdb-wasm-app to ${TARGET_DIR}/"
    rm -rf ${TARGET_DIR}
    mkdir -p ${PAGES_DIR}/branches
    cp -r ${PROJECT_ROOT}/packages/duckdb-wasm-app/build/release ${TARGET_DIR}

    echo "[ RUN ] Install @motherduck/duckdb-wasm typedocs to ${TARGET_DIR}/docs"
    rm -rf ${TARGET_DIR}/docs
    cp -r ${PROJECT_ROOT}/packages/duckdb-wasm/docs ${TARGET_DIR}/docs
fi

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A .
git commit --amend --reset-author -m "Deploy GitHub Pages"
git push origin HEAD:gh-pages --force
