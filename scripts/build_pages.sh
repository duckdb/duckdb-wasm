#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

DEFAULT_BRANCH="master"
CURRENT_BRANCH=${1:-master}

PAGES_DIR=${PROJECT_ROOT}/.pages
rm -rf ${PAGES_DIR}
mkdir -p ${PAGES_DIR}

set -x

echo "[ RUN ] Import existing gh-pages branch"

cd ${PROJECT_ROOT}
git read-tree --prefix=.pages origin/gh-pages
git reset .pages

if [ "${CURRENT_BRANCH}" = "${DEFAULT_BRANCH}" ]; then
    echo "[ RUN ] Install @duckdb/duckdb-wasm-shell to ${PAGES_DIR}/"

    find ${PAGES_DIR} \
        -mindepth 1 \
        -maxdepth 1 \
        -type d \
        -not -name branches \
        -exec echo rm -rf '{}' \;


    cp -r ${PROJECT_ROOT}/packages/duckdb-wasm-shell/build/release/* ${PAGES_DIR}
    cp -r ${PROJECT_ROOT}/packages/duckdb-wasm/docs ${PAGES_DIR}/docs
else
    TARGET_DIR="${PAGES_DIR}/branches/${CURRENT_BRANCH}"
    echo "[ RUN ] Install @duckdb/duckdb-wasm-shell to ${TARGET_DIR}/"

    rm -rf ${TARGET_DIR}
    mkdir -p ${PAGES_DIR}/branches
    cp -r ${PROJECT_ROOT}/packages/duckdb-wasm-shell/build/release ${TARGET_DIR}
    cp -r ${PROJECT_ROOT}/packages/duckdb-wasm/docs ${TARGET_DIR}/docs
fi
