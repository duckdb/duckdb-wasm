#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

CORES=$(grep -c ^processor /proc/cpuinfo 2>/dev/null || sysctl -n hw.ncpu)

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null
DUCKDB_DIR="${PROJECT_ROOT}/submodules/duckdb/"
DUCKDB_BUILD_DIR="${DUCKDB_DIR}/build/Release"

mkdir -p ${DUCKDB_BUILD_DIR}

cmake \
    -S ${DUCKDB_DIR} \
    -B ${DUCKDB_BUILD_DIR} \
    -DCMAKE_C_COMPILER_LAUNCHER=ccache \
    -DCMAKE_CXX_COMPILER_LAUNCHER=ccache \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_TPCH_EXTENSION=1

cmake --build ${DUCKDB_BUILD_DIR} --parallel ${CORES}
