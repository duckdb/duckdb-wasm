#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null
DBGEN_DIR="${PROJECT_ROOT}/submodules/tpch-dbgen"
DBGEN=${DBGEN_DIR}/dbgen
PARQUETGEN=${PROJECT_ROOT}/target/release/parquetgen

SCALE_FACTOR=${1:-0.01}
SCALE_FACTOR_DIR=${SCALE_FACTOR/./_}

TPCH_DIR=${PROJECT_ROOT}/data/tpch
TPCH_SF_OUT=${TPCH_DIR}/${SCALE_FACTOR_DIR}
TPCH_SF_OUT_TBL=${TPCH_SF_OUT}/tbl
TPCH_SF_OUT_PARQUET=${TPCH_SF_OUT}/parquet

echo "SCALE_FACTOR=${SCALE_FACTOR}"

if [ ! -f ${DBGEN} ]; then
    make -C ${DBGEN_DIR} dbgen
fi
echo "DBGEN=${DBGEN}"

if [ ! -f ${PARQUETGEN} ]; then
    cargo build --manifest-path=${PROJECT_ROOT}/Cargo.toml --release -p parquetgen
fi
echo "PARQUETGEN=${PARQUETGEN}"

TBL_COUNT=$(ls -1 ${TPCH_SF_OUT_TBL}/*.tbl 2>/dev/null | wc -l)
if [[ ${TBL_COUNT} -ne 8 ]]; then
    mkdir -p ${TPCH_SF_OUT_TBL}
    cd ${DBGEN_DIR}
    DSS_PATH=${TPCH_SF_OUT_TBL} ./dbgen -vf -s ${SCALE_FACTOR}
fi
echo "TPCH_SF_OUT_TBL=${TPCH_SF_OUT_TBL}"

PARQUET_COUNT=$(ls -1 ${TPCH_SF_OUT_PARQUET}/*.parquet 2>/dev/null | wc -l)
if [[ ${PARQUET_COUNT} -ne 8 ]]; then
    rm -rf ${TPCH_SF_OUT_PARQUET}
    mkdir -p ${TPCH_SF_OUT_PARQUET}
    ${PARQUETGEN} tpch -i ${TPCH_SF_OUT_TBL} -o ${TPCH_SF_OUT_PARQUET}
fi
echo "TPCH_SF_OUT_PARQUET=${TPCH_SF_OUT_PARQUET}"
