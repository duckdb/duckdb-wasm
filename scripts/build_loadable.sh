#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

mkdir -p loadable_extensions
shopt -s nullglob
shopt -s globstar

FILES="build/$1/$2/**/*.duckdb_extension"
for f in $FILES
do
        ext=`basename $f .duckdb_extension`
        echo $ext
        emcc $f -sSIDE_MODULE=1 -o loadable_extensions/$ext.duckdb_extension.wasm -O3
done

ls -la loadable_extensions
