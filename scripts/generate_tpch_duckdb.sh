#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null
DUCKDB_DIR="${PROJECT_ROOT}/submodules/duckdb/"
DUCKDB_BUILD_DIR="${DUCKDB_DIR}/build/Release"
DUCKDB_SHELL="duckdb"
SCALE_FACTOR=${1:-0.01}
SCALE_FACTOR_DIR=${SCALE_FACTOR/./_}
TPCH_DIR=${PROJECT_ROOT}/data/tpch
TPCH_SF_OUT=${TPCH_DIR}/${SCALE_FACTOR_DIR}
TPCH_SF_OUT_DUCKDB=${TPCH_SF_OUT}/duckdb
TPCH_SF_OUT_DUCKDB_DB=${TPCH_SF_OUT_DUCKDB}/db
DUCKDB_SCRIPT_FILE=${TPCH_SF_OUT_DUCKDB}/script.sql

chmod +x ${DUCKDB_SHELL}
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
${DUCKDB_BUILD_DIR}/duckdb --echo < ${DUCKDB_SCRIPT_FILE}
echo "TPCH_SF_OUT_DUCKDB=${TPCH_SF_OUT_DUCKDB}/db"
