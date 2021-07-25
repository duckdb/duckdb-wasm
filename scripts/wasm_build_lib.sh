#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

MODE=${1:-Fast}
FEATURES=${2:-default}
echo "MODE=${MODE}"

CPP_BUILD_DIR="${PROJECT_ROOT}/lib/build/wasm/${MODE}"
CPP_SOURCE_DIR="${PROJECT_ROOT}/lib"
ANALYZER_LIB_DIR="${PROJECT_ROOT}/packages/core/src/analyzer"
DUCKDB_LIB_DIR="${PROJECT_ROOT}/packages/duckdb-wasm/src/bindings"

CORES=$(grep -c ^processor /proc/cpuinfo 2>/dev/null || sysctl -n hw.ncpu)

ADDITIONAL_FLAGS=
SUFFIX=
case $MODE in
  "debug") ADDITIONAL_FLAGS="-DCMAKE_BUILD_TYPE=Debug -DWASM_FAST_LINKING=1" ;;
  "fast") ADDITIONAL_FLAGS="-DCMAKE_BUILD_TYPE=RelWithDebInfo -DWASM_FAST_LINKING=1" ;;
  "release") ADDITIONAL_FLAGS="-DCMAKE_BUILD_TYPE=Release" ;;
   *) ;;
esac
case $FEATURES in
  "default") ADDITIONAL_FLAGS="${ADDITIONAL_FLAGS}" ;;
  "next")
    ADDITIONAL_FLAGS="${ADDITIONAL_FLAGS} -DWITH_WASM_EXCEPTIONS=1 -DWITH_WASM_SIMD=1"
    SUFFIX="_next"
    ;;
  "next_coi")
    ADDITIONAL_FLAGS="${ADDITIONAL_FLAGS} -DWITH_WASM_EXCEPTIONS=1 -DWITH_WASM_SIMD=1 -DWITH_WASM_BULK_MEMORY=1 -DWITH_WASM_THREADS=1"
    SUFFIX="_next_coi"
    ;;
   *) ;;
esac
echo "MODE=${MODE}"
echo "FEATURES=${FEATURES}"

BUILD_DIR="${CPP_SOURCE_DIR}/build/wasm/${MODE}${SUFFIX}"
mkdir -p ${BUILD_DIR}
rm -f ${BUILD_DIR}/duckdb_*.{wasm,js}

set -x

emcmake cmake \
    -S${CPP_SOURCE_DIR} \
    -B${BUILD_DIR} \
    -DCMAKE_C_COMPILER_LAUNCHER=ccache \
    -DCMAKE_CXX_COMPILER_LAUNCHER=ccache \
    ${ADDITIONAL_FLAGS}

emmake make \
    -C${BUILD_DIR} \
    -j${CORES} \
    duckdb_wasm

cp ${BUILD_DIR}/duckdb_wasm.wasm ${DUCKDB_LIB_DIR}/duckdb_wasm${SUFFIX}.wasm
cp ${BUILD_DIR}/duckdb_wasm.js ${DUCKDB_LIB_DIR}/duckdb_wasm${SUFFIX}.js
if [ -f ${BUILD_DIR}/duckdb_wasm.worker.js ]; then
  cp ${BUILD_DIR}/duckdb_wasm.worker.js ${DUCKDB_LIB_DIR}/duckdb_wasm${SUFFIX}.pthread.js

  # Expose pthread
  printf "\nexport const getPThread = () => PThread;\n" >> ${DUCKDB_LIB_DIR}/duckdb_wasm${SUFFIX}.js

  # Expose the module.
  # This will allow us to reuse the generated pthread handler and only overwrite the loading.
  # More info: duckdb-browser-async-eh-mt.pthread.worker.ts
  printf "\nthis.getModule = () => Module;\nthis.setModule = (m) => { Module = m; };\n" >> ${DUCKDB_LIB_DIR}/duckdb_wasm${SUFFIX}.pthread.js
fi
