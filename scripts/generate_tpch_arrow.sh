#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null
DATAPREP=${PROJECT_ROOT}/target/release/dataprep
SCALE_FACTOR=${1:-0.01}
SCALE_FACTOR_DIR=${SCALE_FACTOR/./_}
TPCH_DIR=${PROJECT_ROOT}/data/tpch
TPCH_SF_OUT=${TPCH_DIR}/${SCALE_FACTOR_DIR}
TPCH_SF_OUT_TBL=${TPCH_SF_OUT}/tbl
TPCH_SF_OUT_PARQUET=${TPCH_SF_OUT}/parquet
TPCH_SF_OUT_ARROW=${TPCH_SF_OUT}/arrow

echo "SCALE_FACTOR=${SCALE_FACTOR}"

if [ ! -f ${DATAPREP} ]; then
    cargo build --manifest-path=${PROJECT_ROOT}/Cargo.toml --release -p dataprep
fi
chmod +x ${DATAPREP}
echo "DATAPREP=${DATAPREP}"

TBL_COUNT=$(find ${TPCH_SF_OUT_TBL} -name "*.tbl" | wc -l)
if [[ ${TBL_COUNT} -ne 8 ]]; then
    echo "ERROR could find all required tbl files"
    exit 1
fi

mkdir -p ${TPCH_SF_OUT_ARROW} ${TPCH_SF_OUT_PARQUET}
PARQUET_COUNT=$(find ${TPCH_SF_OUT_PARQUET} -name "*.parquet" | wc -l)
ARROW_COUNT=$(find ${TPCH_SF_OUT_ARROW} -name "*.arrow" | wc -l)
if [[ ${PARQUET_COUNT} -ne 8 || ${ARROW_COUNT} -ne 8 ]]; then
    rm -rf ${TPCH_SF_OUT_ARROW}/*.arrow
    rm -rf ${TPCH_SF_OUT_PARQUET}/*.parquet
    ${DATAPREP} tpch \
        --in ${TPCH_SF_OUT_TBL} \
        --out-arrow ${TPCH_SF_OUT_ARROW} \
        --out-parquet ${TPCH_SF_OUT_PARQUET}
fi
echo "TPCH_SF_OUT_PARQUET=${TPCH_SF_OUT_PARQUET}"
echo "TPCH_SF_OUT_ARROW=${TPCH_SF_OUT_ARROW}"
