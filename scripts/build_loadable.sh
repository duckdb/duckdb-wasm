#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

mkdir -p loadable_extensions
shopt -s nullglob

for f in `find ./build/$1/$2 -name '*.duckdb_extension'`
do
        ext=`basename $f .duckdb_extension`
        echo "Building '$ext'..."
        emcc $f -sSIDE_MODULE=1 -o loadable_extensions/$ext.duckdb_extension.wasm -O3
done

ls -la loadable_extensions
