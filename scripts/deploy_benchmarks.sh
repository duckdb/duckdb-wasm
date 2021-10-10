#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

PAGES_DIR=${PROJECT_ROOT}/.pages
rm -rf ${PAGES_DIR}
mkdir -p ${PAGES_DIR}

set -x

echo "[ RUN ] Import existing gh-pages branch"

cd ${PROJECT_ROOT}
git read-tree --prefix=.pages origin/gh-pages
git reset .pages

echo "[ RUN ] Copy benchmarks.arrow"

mkdir -p ${PAGES_DIR}/reports/
cp -r ${PROJECT_ROOT}/reports/benchmarks.arrow ${PAGES_DIR}/reports/benchmarks.arrow
