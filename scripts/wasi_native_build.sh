#!/usr/bin/env bash
# The dependency-free native binary: the legacy-EH wasi module translated to C by wasm2c (wabt), compiled with
# the host's clang together with wabt's runtime and the host of wasi/native/host.c.
#
#   scripts/wasi_native_build.sh [jobs]
#
# Input: build/wasi/duckdb_wasi-legacy.wasm (scripts/wasi_build.sh legacy). Output: build/wasi/native/duckdb_native
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JOBS=${1:-4}
WABT=${WABT_PREFIX:-/opt/homebrew}
RT=${WABT}/share/wabt/wasm2c
OUT=${PROJECT_ROOT}/build/wasi/native
MODULE=${PROJECT_ROOT}/build/wasi/duckdb_wasi-legacy.wasm
mkdir -p "${OUT}/c" "${OUT}/o"

# 16 translation units of ~50 MB each: wasm2c is quick, clang is not
wasm2c --num-outputs=16 -n duckdb "${MODULE}" -o "${OUT}/c/duckdb.c"
# Guard pages instead of bounds checks (64-bit host), a trap on stack exhaustion
# The generated duckdb.h comes before any installed DuckDB C API header of the same name
CFLAGS="-O2 -w -I${OUT}/c -I${WABT}/include -I${RT} -DWASM_RT_USE_MMAP=1 -DWASM_RT_MEMCHECK_GUARD_PAGES=1"
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
