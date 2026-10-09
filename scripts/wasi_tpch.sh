#!/usr/bin/env bash
# TPC-H: dbgen at a scale factor, then the 22 queries, single-threaded, the same statements on each engine.
#
#   scripts/wasi_tpch.sh <engine> [sf] [memory_limit]
#
#   engine   cli       the native DuckDB CLI of the same version (~/.duckdb/cli/<version>/duckdb), the bottom line
#            wasmtime  build/wasi/duckdb_wasi-exnref.wasm under wasmtime, a spill directory and a memory cap
#            native    build/wasi/native/duckdb_native, the wasm2c translation with the host of wasi/native
#
# e.g. scripts/wasi_tpch.sh wasmtime 1 300MB   -- SF 1 with spilling; an empty memory_limit means no limit
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENGINE=${1:-wasmtime}
SF=${2:-1}
MEMORY_LIMIT=${3:-}
CLI=${DUCKDB_CLI:-${HOME}/.duckdb/cli/2.0.0-alpha44357/duckdb}
SPILL=${PROJECT_ROOT}/build/wasi/spill
rm -rf "${SPILL}" && mkdir -p "${SPILL}"

# The sandbox sees the spill directory as /spill, the CLI uses the host path
SPILL_PATH=/spill
[ "${ENGINE}" = cli ] && SPILL_PATH=${SPILL}
SETUP="SET threads = 1; SET temp_directory = '${SPILL_PATH}'"
if [ -n "${MEMORY_LIMIT}" ]; then
  SETUP="${SETUP}; SET memory_limit = '${MEMORY_LIMIT}'"
fi
STATEMENTS=(-c "${SETUP}" -c "CALL dbgen(sf = ${SF})")
for q in $(seq 1 22); do
  STATEMENTS+=(-c "PRAGMA tpch(${q})")
done

case ${ENGINE} in
  cli)
    # -q: results are not printed, like the runner; the CLI prints its timer after each statement
    "${CLI}" -no-agent -c ".timer on" -c ".output /dev/null" "${STATEMENTS[@]}" 2>&1 | grep -i "time\|error"
    ;;
  wasmtime)
    # --dir: the only directory the sandbox can see; -W max-memory-size: the hard cap
    wasmtime run -W exceptions -W max-memory-size=4294967296 --dir="${SPILL}::/spill" \
      "${PROJECT_ROOT}/build/wasi/duckdb_wasi-exnref.wasm" -t -q "${STATEMENTS[@]}"
    ;;
  native)
    "${PROJECT_ROOT}/build/wasi/native/duckdb_native" --dir "${SPILL}::/spill:rw" -- -t -q "${STATEMENTS[@]}"
    ;;
  *) echo "unknown engine '${ENGINE}', expected cli, wasmtime or native"; exit 1 ;;
esac
echo "spill files left: $(ls "${SPILL}" | wc -l)"
