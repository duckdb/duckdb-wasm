#!/usr/bin/env bash

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

NPM_VERSION=${1}
echo "NPM_VERSION=${NPM_VERSION}"

PKG_DIR="${PROJECT_ROOT}/packages/duckdb-wasm"
PKG_TARBALL="duckdb-duckdb-wasm-${NPM_VERSION}.tgz"
TMP_DIR="${PROJECT_ROOT}/.tmp/npm"
echo "${NPM_VERSION}"

set -x

rm -rf ${TMP_DIR}
mkdir -p ${TMP_DIR}
cd ${TMP_DIR}

npm pack "@motherduck/duckdb-wasm@${NPM_VERSION}"
tar -xvzf ./duckdb-duckdb-wasm-*.tgz

rm -rf "${PKG_DIR}/dist"
cp -r "./package/dist" "${PKG_DIR}/dist"
