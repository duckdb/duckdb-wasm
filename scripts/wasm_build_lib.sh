#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

MODE=${1:-Fast}
FEATURES=${2:-default}
echo "MODE=${MODE}"
echo "BOOST_ARCHIVE=${BOOST_ARCHIVE}"

CPP_BUILD_DIR="${PROJECT_ROOT}/lib/build/wasm/${MODE}"
CPP_SOURCE_DIR="${PROJECT_ROOT}/lib"
ANALYZER_LIB_DIR="${PROJECT_ROOT}/packages/core/src/analyzer"
DUCKDB_LIB_DIR="${PROJECT_ROOT}/packages/duckdb/src/bindings"

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
  "eh")
    ADDITIONAL_FLAGS="${ADDITIONAL_FLAGS} -DWITH_WASM_EXCEPTIONS=1"
    SUFFIX="_eh"
    ;;
  "eh_mt")
    ADDITIONAL_FLAGS="${ADDITIONAL_FLAGS} -DWITH_WASM_EXCEPTIONS=1 -DWITH_WASM_THREADS=1"
    SUFFIX="_eh_mt"
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
    -DBOOST_ARCHIVE=${BOOST_ARCHIVE} \
    ${ADDITIONAL_FLAGS}

emmake make \
    -C${BUILD_DIR} \
    -j${CORES} \
    duckdb_wasm

cp ${BUILD_DIR}/duckdb_wasm.wasm ${DUCKDB_LIB_DIR}/duckdb_wasm${SUFFIX}.wasm
cp ${BUILD_DIR}/duckdb_wasm.js ${DUCKDB_LIB_DIR}/duckdb_wasm${SUFFIX}.js
