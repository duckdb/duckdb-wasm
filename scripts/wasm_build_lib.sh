#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

MODE=${1:-Fast}
echo "MODE=${MODE}"
echo "BOOST_ARCHIVE=${BOOST_ARCHIVE}"

CPP_BUILD_DIR="${PROJECT_ROOT}/lib/build/wasm/${MODE}"
CPP_SOURCE_DIR="${PROJECT_ROOT}/lib"
ANALYZER_LIB_DIR="${PROJECT_ROOT}/packages/core/src/analyzer"
DUCKDB_LIB_DIR="${PROJECT_ROOT}/packages/duckdb/src/bindings"

CORES=$(grep -c ^processor /proc/cpuinfo 2>/dev/null || sysctl -n hw.ncpu)

ADDITIONAL_FLAGS=
case $MODE in
  "Debug") ADDITIONAL_FLAGS="-DCMAKE_BUILD_TYPE=Debug -DWASM_FAST_LINKING=1" ;;
  "Fast") ADDITIONAL_FLAGS="-DCMAKE_BUILD_TYPE=RelWithDebInfo -DWASM_FAST_LINKING=1" ;;
  "Release") ADDITIONAL_FLAGS="-DCMAKE_BUILD_TYPE=Release" ;;
   *) ;;
esac
echo "Build Type: ${MODE}"

mkdir -p ${CPP_SOURCE_DIR}/build/wasm/${MODE}
rm -f ${CPP_SOURCE_DIR}/build/wasm/${MODE}/duckdb_*.{wasm,js}

set -x

emcmake cmake \
    -S"${CPP_SOURCE_DIR}/" \
    -B"${CPP_SOURCE_DIR}/build/wasm/${MODE}" \
    -DCMAKE_C_COMPILER_LAUNCHER=ccache \
    -DCMAKE_CXX_COMPILER_LAUNCHER=ccache \
    -DBOOST_ARCHIVE=${BOOST_ARCHIVE} \
    ${ADDITIONAL_FLAGS}

emmake make \
    -C"${CPP_SOURCE_DIR}/build/wasm/${MODE}" \
    -j${CORES} \
    duckdb_wasm duckdb_wasm_node

cp ${CPP_SOURCE_DIR}/build/wasm/${MODE}/duckdb_*.{wasm,js} "${DUCKDB_LIB_DIR}"
