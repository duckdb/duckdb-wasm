#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null
SCALE_FACTOR=${1:-0.01}
SCALE_FACTOR_DIR=${SCALE_FACTOR/./_}
TPCH_DIR=${PROJECT_ROOT}/data/tpch
TPCH_SF_OUT=${TPCH_DIR}/${SCALE_FACTOR_DIR}
TPCH_SF_OUT_DUCKDB=${TPCH_SF_OUT}/duckdb
TPCH_SF_OUT_DUCKDB_DB=${TPCH_SF_OUT_DUCKDB}/db
DUCKDB_SCRIPT_FILE=${TPCH_SF_OUT_DUCKDB}/script.sql

if [[ -n "${DUCKDB_SHELL:-}" ]]; then
    DUCKDB_SHELL_CANDIDATES=("${DUCKDB_SHELL}")
else
    DUCKDB_SHELL_CANDIDATES=(
        "${PROJECT_ROOT}/submodules/duckdb/build/release/duckdb"
        "duckdb"
    )
fi

DUCKDB_SHELL_PATH=""
for candidate in "${DUCKDB_SHELL_CANDIDATES[@]}"; do
    if DUCKDB_SHELL_PATH="$(command -v "${candidate}")"; then
        break
    fi
done
if [[ -z "${DUCKDB_SHELL_PATH}" ]]; then
    echo "DuckDB CLI not found: build the submodule CLI, install duckdb, or set DUCKDB_SHELL" >&2
    exit 1
fi
echo "DUCKDB_SHELL=${DUCKDB_SHELL_PATH}"
mkdir -p ${TPCH_SF_OUT_DUCKDB}
rm -r ${TPCH_SF_OUT_DUCKDB}
mkdir -p ${TPCH_SF_OUT_DUCKDB}

cat << END >${DUCKDB_SCRIPT_FILE}
.open ${TPCH_SF_OUT_DUCKDB_DB}
install tpch;
load tpch;
call dbgen(sf = ${SCALE_FACTOR});
checkpoint;
.databases
.tables
END
"${DUCKDB_SHELL_PATH}" --echo < ${DUCKDB_SCRIPT_FILE}
echo "TPCH_SF_OUT_DUCKDB=${TPCH_SF_OUT_DUCKDB}/db"
