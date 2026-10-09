#!/usr/bin/env bash
# The dependency-free native binary: the legacy-EH wasi module translated to C by wasm2c (wabt), compiled with
# the host's clang together with wabt's runtime and the host of wasi/native/host.c.
#
#   scripts/wasi_native_build.sh [jobs] [legacy|wasm64]
#   TUNED=1: -O3, LTO and no per-call stack depth accounting (the native guard page still catches overflows),
#   into build/wasi/native<64>-tuned. For the 64-bit module the bounds check of every access also becomes one
#   compare against the reserved size: the memory is reserved whole and inaccessible past its current size, so
#   an address below the cap either lands in memory or faults into the trap handler.
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
OPT="-O2"
if [ "${TUNED:-}" = 1 ]; then
  OUT=${OUT}-tuned
  OPT="-O3 -flto=thin -DWASM_RT_NONCONFORMING_UNCHECKED_STACK_EXHAUSTION=1"
fi
MODULE=${PROJECT_ROOT}/build/wasi/duckdb_wasi-${TARGET}.wasm
mkdir -p "${OUT}/c" "${OUT}/o"

# 16 translation units of ~50 MB each: wasm2c is quick, clang is not
wasm2c --num-outputs=16 -n duckdb "${MODULE}" -o "${OUT}/c/duckdb.c"
if [ "${TUNED:-}" = 1 ] && [ "${TARGET}" = wasm64 ]; then
  python3 - "${OUT}/c/duckdb-impl.h" <<'EOF_CHECK'
import sys
path = sys.argv[1]
src = open(path).read()
old = """#define RANGE_CHECK(mem, offset, len)            \\
  do {                                           \\
    uint64_t res = checked_add_u64(offset, len); \\
    if (UNLIKELY(res > (mem)->size))             \\
      TRAP(OOB);                                 \\
  } while (0);"""
new = """/* DuckDB sandbox: the memory is reserved at its 16 GB maximum and inaccessible past its current size, so an
 * address below the cap (less the widest access) is either in bounds or faults into the trap handler */
#define RANGE_CHECK(mem, offset, len)                                   \\
  do {                                                                  \\
    if (UNLIKELY((uint64_t)(offset) >= (uint64_t)17179869184ull - 64)) \\
      TRAP(OOB);                                                        \\
  } while (0);"""
assert src.count(old) == 1, "RANGE_CHECK not found once in the generated header"
open(path, "w").write(src.replace(old, new))
EOF_CHECK
fi
# Guard pages instead of bounds checks (64-bit host), a trap on stack exhaustion
# The generated duckdb.h comes before any installed DuckDB C API header of the same name
CFLAGS="${OPT} -w -I${OUT}/c -I${WABT}/include -I${RT} -I${PROJECT_ROOT}/wasi/native/rt -DWASM_RT_USE_MMAP=1 -DWASM_RT_MEMCHECK_GUARD_PAGES=1 ${HOST_FLAGS}"
compile() {
  local o="${OUT}/o/$(basename "$1" .c).o"
  [ "${o}" -nt "$1" ] || clang ${CFLAGS} -c "$1" -o "${o}"
}
running=0
# wasm-rt-mem-impl is wabt's with one change: a memory with a declared maximum is reserved at that size and
# grown in place (wabt grows 64-bit memories with realloc, moving them)
for f in "${OUT}"/c/duckdb_*.c "${RT}"/wasm-rt-impl.c "${PROJECT_ROOT}"/wasi/native/rt/wasm-rt-mem-impl.c \
         "${RT}"/wasm-rt-exceptions-impl.c "${PROJECT_ROOT}"/wasi/native/host.c; do
  compile "${f}" &
  running=$((running + 1))
  if [ "${running}" -ge "${JOBS}" ]; then wait -n; running=$((running - 1)); fi
done
wait
clang ${OPT} "${OUT}"/o/*.o -o "${OUT}/duckdb_native"
ls -la "${OUT}/duckdb_native"
