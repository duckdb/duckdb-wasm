#!/usr/bin/env bash

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

cd ${PROJECT_ROOT}/packages/duckdb-wasm
mkdir -p ./dist/img
cp ${PROJECT_ROOT}/misc/duckdb.svg ./dist/img/duckdb.svg
cp ${PROJECT_ROOT}/misc/duckdb_wasm.svg ./dist/img/duckdb_wasm.svg
${PROJECT_ROOT}/scripts/build_duckdb_badge.sh > ./dist/img/duckdb_version_badge.svg

npm install -g pkg-size
pkg-size . --sizes=size > output
cat output
tail -n2 output | grep " MB" | awk '{print ($1 < 150)}' | grep "1" || exit 1
