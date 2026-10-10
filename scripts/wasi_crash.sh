#!/usr/bin/env bash
# SQL that crashes: crash(kind) from wasi/crash.cpp on each engine, what happens and what the process reports.
#
#   scripts/wasi_crash.sh [engine...]      (default: host wasmtime native)
#
#   0 null dereference, 1 wild pointer write, 2 stack overflow, 3 abort
# Natively each one ends the process (a signal); in the sandbox the memory ones differ: there is no unmapped
# page at address 0, so a null dereference is a silent write into linear memory, while a wild pointer past
# the memory is a trap. The CLI has no crash(), it is not in the list.
set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENGINES=${*:-host wasmtime native}
SPILL=${PROJECT_ROOT}/build/wasi/spill
mkdir -p "${SPILL}"
KINDS=("null dereference" "wild pointer write" "stack overflow" "abort")

for engine in ${ENGINES}; do
  for kind in 0 1 2 3; do
    sql="SELECT crash(${kind}) AS k"
    # after the crash statement a second one shows whether the engine is still alive
    case ${engine} in
      host) out=$("${PROJECT_ROOT}/build/wasi/duckdb_host" -c "${sql}" -c "SELECT 'alive' AS s" 2>&1); rc=$? ;;
      wasmtime) out=$(wasmtime run -W exceptions --dir="${SPILL}::/spill" "${PROJECT_ROOT}/build/wasi/duckdb_wasi-exnref.wasm" -c "${sql}" -c "SELECT 'alive' AS s" 2>&1); rc=$? ;;
      native*) out=$("${PROJECT_ROOT}/build/wasi/${engine}/duckdb_native" --dir "${SPILL}::/spill:rw" -- -c "${sql}" -c "SELECT 'alive' AS s" 2>&1); rc=$? ;;
      *) echo "unknown engine ${engine}"; exit 1 ;;
    esac
    alive=no; grep -q "^alive" <<<"${out}" && alive=yes
    # the most telling line: a trap, a signal, an error
    message=$(grep -i -m1 "trap\|signal\|fault\|abort\|error\|out of bounds\|unreachable\|exhaust" <<<"${out}" | cut -c1-110)
    printf '%-9s %-20s rc=%-4s alive=%-3s %s\n' "${engine}" "${KINDS[$kind]}" "${rc}" "${alive}" "${message}"
  done
done
