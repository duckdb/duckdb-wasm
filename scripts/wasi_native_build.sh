#!/usr/bin/env bash
# The dependency-free native binary: the legacy-EH wasi module translated to C by wasm2c (wabt), compiled with
# the host's clang together with wabt's runtime and the host of wasi/native/host.c.
#
#   scripts/wasi_native_build.sh [jobs] [legacy|wasm64]
#
# Input: build/wasi/duckdb_wasi-<target>.wasm (scripts/wasi_build.sh legacy|wasm64).
# Output: build/wasi/native/duckdb_native, or build/wasi/native64/duckdb_native for the 64-bit module
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JOBS=${1:-4}
TARGET=${2:-legacy}
WABT=${WABT_PREFIX:-/opt/homebrew}
RT=${WABT}/share/wabt/wasm2c
OUT=${PROJECT_ROOT}/build/wasi/native
HOST_FLAGS=""
if [ "${TARGET}" = wasm64 ]; then
  OUT=${PROJECT_ROOT}/build/wasi/native64
  HOST_FLAGS="-DSANDBOX_WASM64=1"
fi
MODULE=${PROJECT_ROOT}/build/wasi/duckdb_wasi-${TARGET}.wasm
mkdir -p "${OUT}/c" "${OUT}/o"

# 16 translation units of ~50 MB each: wasm2c is quick, clang is not
wasm2c --num-outputs=16 -n duckdb "${MODULE}" -o "${OUT}/c/duckdb.c"
# Guard pages instead of bounds checks (64-bit host), a trap on stack exhaustion
# The generated duckdb.h comes before any installed DuckDB C API header of the same name
CFLAGS="-O2 -w -I${OUT}/c -I${WABT}/include -I${RT} -DWASM_RT_USE_MMAP=1 -DWASM_RT_MEMCHECK_GUARD_PAGES=1 ${HOST_FLAGS}"
compile() {
  local o="${OUT}/o/$(basename "$1" .c).o"
  [ "${o}" -nt "$1" ] || clang ${CFLAGS} -c "$1" -o "${o}"
}
running=0
for f in "${OUT}"/c/duckdb_*.c "${RT}"/wasm-rt-impl.c "${RT}"/wasm-rt-mem-impl.c "${RT}"/wasm-rt-exceptions-impl.c \
         "${PROJECT_ROOT}"/wasi/native/host.c; do
  compile "${f}" &
  running=$((running + 1))
  if [ "${running}" -ge "${JOBS}" ]; then wait -n; running=$((running - 1)); fi
done
wait
clang -O2 "${OUT}"/o/*.o -o "${OUT}/duckdb_native"
ls -la "${OUT}/duckdb_native"
