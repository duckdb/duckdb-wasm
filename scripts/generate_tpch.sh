#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null
DBGEN_DIR="${PROJECT_ROOT}/submodules/tpch-dbgen/dbgen"
DBGEN=${DBGEN_DIR}/dbgen
PARQUETGEN=${PROJECT_ROOT}/target/release/parquetgen
DUCKDB_DIR="${PROJECT_ROOT}/submodules/duckdb/"
DUCKDB_BUILD_DIR="${DUCKDB_DIR}/build/Release"
DUCKDB_SHELL="${DUCKDB_BUILD_DIR}/duckdb"

SCALE_FACTOR=${1:-0.01}
SCALE_FACTOR_DIR=${SCALE_FACTOR/./_}

TPCH_DIR=${PROJECT_ROOT}/data/tpch
TPCH_SF_OUT=${TPCH_DIR}/${SCALE_FACTOR_DIR}
TPCH_SF_OUT_TBL=${TPCH_SF_OUT}/tbl
TPCH_SF_OUT_PARQUET=${TPCH_SF_OUT}/parquet
TPCH_SF_OUT_DUCKDB=${TPCH_SF_OUT}/duckdb
TPCH_SF_OUT_DUCKDB_DB=${TPCH_SF_OUT_DUCKDB}/db

DUCKDB_SCRIPT_FILE=${TPCH_SF_OUT_DUCKDB}/script.sql

${PROJECT_ROOT}/scripts/build_duckdb_shell.sh

echo "SCALE_FACTOR=${SCALE_FACTOR}"

if [ ! -f ${DBGEN} ]; then
    cd ${DBGEN_DIR}
    case "$(uname)" in
        'Linux');;
        'Darwin')
            echo "Patch Makefile"
            sed -i '.bak' -e "s/LINUX/MACOS/g" ./Makefile
            ;; 
    esac
    make -C ${DBGEN_DIR} dbgen
fi
echo "DBGEN=${DBGEN}"

if [ ! -f ${PARQUETGEN} ]; then
    cargo build --manifest-path=${PROJECT_ROOT}/Cargo.toml --release -p parquetgen
fi
echo "PARQUETGEN=${PARQUETGEN}"

mkdir -p ${TPCH_SF_OUT_TBL}
TBL_COUNT=$(find ${TPCH_SF_OUT_TBL} -name "*.tbl" | wc -l)
if [[ ${TBL_COUNT} -ne 8 ]]; then
    cd ${DBGEN_DIR}
    DSS_PATH=${TPCH_SF_OUT_TBL} ./dbgen -vf -s ${SCALE_FACTOR}
fi
echo "TPCH_SF_OUT_TBL=${TPCH_SF_OUT_TBL}"

mkdir -p ${TPCH_SF_OUT_PARQUET}
PARQUET_COUNT=$(find ${TPCH_SF_OUT_TBL} -name "*.parquet" | wc -l)
if [[ ${PARQUET_COUNT} -ne 8 ]]; then
    rm -rf ${TPCH_SF_OUT_PARQUET}/*.parquet
    ${PARQUETGEN} tpch -i ${TPCH_SF_OUT_TBL} -o ${TPCH_SF_OUT_PARQUET}
fi
echo "TPCH_SF_OUT_PARQUET=${TPCH_SF_OUT_PARQUET}"

mkdir -p ${TPCH_SF_OUT_DUCKDB}
rm -r ${TPCH_SF_OUT_DUCKDB}
mkdir -p ${TPCH_SF_OUT_DUCKDB}
cat << END >${DUCKDB_SCRIPT_FILE}
.open ${TPCH_SF_OUT_DUCKDB_DB}
call dbgen(sf = ${SCALE_FACTOR});
checkpoint;
.databases
.tables
END
${DUCKDB_BUILD_DIR}/duckdb --echo < ${DUCKDB_SCRIPT_FILE}
echo "TPCH_SF_OUT_DUCKDB=${TPCH_SF_OUT_DUCKDB}/db"
