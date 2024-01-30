#!/usr/bin/env bash

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

cd ${PROJECT_ROOT}/packages/react-duckdb
mkdir -p ./dist/img
cp ${PROJECT_ROOT}/misc/duckdb_wasm.svg ./dist/img/duckdb_wasm.svg
${PROJECT_ROOT}/scripts/build_duckdb_badge.sh > ./dist/img/duckdb_version_badge.svg

npm publish --ignore-scripts --access public --tag ${TAG}
