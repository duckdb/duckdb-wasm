#!/usr/bin/env bash

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

${PROJECT_ROOT}/scripts/npm_version.sh

PKG_DIR="${PROJECT_ROOT}/packages/duckdb-wasm"
PKG_VERSION="$(cd ${PKG_DIR} && npm pkg get version | sed 's/"//g')"
PKG_TARBALL="duckdb-duckdb-wasm-${PKG_VERSION}.tgz"
TMP_DIR="${PROJECT_ROOT}/.tmp/npm"
echo "${PKG_VERSION}"

set -x

rm -rf ${TMP_DIR}
mkdir -p ${TMP_DIR}
cd ${TMP_DIR}

npm pack "@duckdb/duckdb-wasm@${PKG_VERSION}"
tar -xvzf "./${PKG_TARBALL}"

rm -rf "${PKG_DIR}/dist"
cp -r "./package/dist" "${PKG_DIR}/dist"
