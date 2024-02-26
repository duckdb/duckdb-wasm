#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

MODE=$1
FEATURE=$2
INPUT_PATH=./build/${MODE}/${FEATURE}/
OUTPUT_PATH=loadable_extensions/${MODE}/${FEATURE}/

mkdir -p "${OUTPUT_PATH}"
shopt -s nullglob

for ext_path in $(find "${INPUT_PATH}" -name '*.duckdb_extension.wasm.lib')
do
        ext_name=$(basename "$ext_path" .duckdb_extension.wasm.lib)
        echo "Building '$ext_name'..."
        emcc "$ext_path" -sSIDE_MODULE=2 -sEXPORTED_FUNCTIONS="_""$ext_name""_init,_""$ext_name""_version" -o "${INPUT_PATH}/$ext_name.duckdb_extension.wasm" -O3 -sSHARED_MEMORY=1 -pthread
done
