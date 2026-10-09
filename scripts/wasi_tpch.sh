#!/usr/bin/env bash
# TPC-H: dbgen at a scale factor, then the 22 queries, single-threaded, the same statements on each engine.
#
#   scripts/wasi_tpch.sh <engine> [sf] [memory_limit] [memory|disk|external]
#   scripts/wasi_tpch.sh generate <sf>     -- the CLI generates build/wasi/data/tpch<sf>.db (all threads)
#
#   engine   cli       the native DuckDB CLI of the same version (~/.duckdb/cli/<version>/duckdb), the bottom line
#            host      build/wasi/duckdb_host, the same sources, flags and runner built natively (64-bit)
#            wasmtime  build/wasi/duckdb_wasi-exnref.wasm under wasmtime, a spill directory and a memory cap
#            native    build/wasi/native/duckdb_native, the wasm2c translation with the host of wasi/native
#   disk     the database is a file in the spill directory instead of in memory (scale factors above memory)
#   external build/wasi/data/tpch<sf>.db, generated outside the sandbox and handed to it read-only; no dbgen
#
# e.g. scripts/wasi_tpch.sh wasmtime 1 300MB   -- SF 1 with spilling; an empty memory_limit means no limit
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENGINE=${1:-wasmtime}
SF=${2:-1}
MEMORY_LIMIT=${3:-}
STORAGE=${4:-memory}
CLI=${DUCKDB_CLI:-${HOME}/.duckdb/cli/2.0.0-alpha44357/duckdb}
SPILL=${PROJECT_ROOT}/build/wasi/spill
DATA=${PROJECT_ROOT}/build/wasi/data
if [ "${ENGINE}" = generate ]; then
  mkdir -p "${DATA}" && rm -f "${DATA}/tpch${SF}.db"
  "${CLI}" -no-agent "${DATA}/tpch${SF}.db" -c ".timer on" -c "CALL dbgen(sf = ${SF})" -c "CHECKPOINT"
  ls -la "${DATA}/tpch${SF}.db"
  exit 0
fi
rm -rf "${SPILL}" && mkdir -p "${SPILL}"

# The sandbox sees the spill directory as /spill, the native engines use the host path
SPILL_PATH=/spill
case ${ENGINE} in cli|host) SPILL_PATH=${SPILL} ;; esac
DATABASE=()
[ "${STORAGE}" = disk ] && DATABASE=(-d "${SPILL_PATH}/tpch.db")
DATA_PATH=/data
case ${ENGINE} in cli|host) DATA_PATH=${DATA} ;; esac
[ "${STORAGE}" = external ] && DATABASE=(-r -d "${DATA_PATH}/tpch${SF}.db")
SETUP="SET threads = 1; SET temp_directory = '${SPILL_PATH}'"
if [ -n "${MEMORY_LIMIT}" ]; then
  SETUP="${SETUP}; SET memory_limit = '${MEMORY_LIMIT}'"
fi
STATEMENTS=(-c "${SETUP}")
[ "${STORAGE}" != external ] && STATEMENTS+=(-c "CALL dbgen(sf = ${SF})")
for q in $(seq 1 22); do
  STATEMENTS+=(-c "PRAGMA tpch(${q})")
done

case ${ENGINE} in
  cli)
    # the CLI prints its timer after each statement; results are not printed, like the runner with -q
    CLI_ARGS=()
    [ "${STORAGE}" = disk ] && CLI_ARGS=("${SPILL_PATH}/tpch.db")
    [ "${STORAGE}" = external ] && CLI_ARGS=(-readonly "${DATA_PATH}/tpch${SF}.db")
    "${CLI}" -no-agent "${CLI_ARGS[@]}" -c ".timer on" -c ".output /dev/null" "${STATEMENTS[@]}" 2>&1 \
      | grep -i "time\|error" | sed 's/Run Time (s): real \([0-9.]*\).*/Run Time (s): \1/'
    ;;
  host)
    "${PROJECT_ROOT}/build/wasi/duckdb_host" "${DATABASE[@]}" -t -q "${STATEMENTS[@]}"
    ;;
  wasmtime)
    # --dir: the only directory the sandbox can see; -W max-memory-size: the hard cap
    mkdir -p "${DATA}"
    wasmtime run -W exceptions -W max-memory-size=4294967296 --dir="${SPILL}::/spill" --dir="${DATA}::/data" \
      "${PROJECT_ROOT}/build/wasi/duckdb_wasi-exnref.wasm" "${DATABASE[@]}" -t -q "${STATEMENTS[@]}"
    ;;
  native)
    mkdir -p "${DATA}"
    "${PROJECT_ROOT}/build/wasi/native/duckdb_native" --dir "${SPILL}::/spill:rw" --dir "${DATA}::/data" -- "${DATABASE[@]}" -t -q "${STATEMENTS[@]}"
    ;;
  *) echo "unknown engine '${ENGINE}', expected cli, host, wasmtime or native"; exit 1 ;;
esac
echo "spill files left: $(ls "${SPILL}" | wc -l)"
