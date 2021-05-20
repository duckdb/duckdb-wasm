#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

BRANCH=${1:-master}

PAGES_DIR=${PROJECT_ROOT}/.pages
rm -rf ${PAGES_DIR}
mkdir -p ${PAGES_DIR}

set -x

echo "[ RUN ] Import existing gh-pages branch"

cd ${PROJECT_ROOT}
git read-tree --prefix=.pages origin/gh-pages
git reset .pages


echo "[ RUN ] Bundle @duckdb/explorer in /branch/${BRANCH}"

rm -rf ${PAGES_DIR}/branch/${BRANCH}
mkdir -p ${PAGES_DIR}/branch
cp -r ${PROJECT_ROOT}/packages/explorer/build/release ${PAGES_DIR}/branch/${BRANCH}