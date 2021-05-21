#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null
DBGEN_DIR="${PROJECT_ROOT}/submodules/dbgen"
DBGEN=${DBGEN_DIR}/dbgen

SCALE_FACTOR=${1:-0.01}
SCALE_FACTOR_DIR=${SCALE_FACTOR/./_}
echo "SCALE_FACTOR=${SCALE_FACTOR}"

make -C ${DBGEN_DIR} dbgen

TPCH_DIR=${PROJECT_ROOT}/data/tpch
TPCH_SF_OUT=${TPCH_DIR}/${SCALE_FACTOR_DIR}
TPCH_SF_OUT_TBL=${TPCH_SF_OUT}/tbl
TPCH_SF_OUT_PARQUET=${TPCH_SF_OUT}/parquet
TPCH_SF_ARCHIVE=${TPCH_DIR}/${SCALE_FACTOR_DIR}.tgz

rm -rf ${TPCH_SF_OUT}

if [ -f ${TPCH_SF_ARCHIVE} ]; then
    echo "Extracing archive"
    mkdir -p ${TPCH_SF_OUT}
    cd ${TPCH_SF_OUT}
    tar -xvzf ${TPCH_SF_ARCHIVE} 
    exit 0
else
    echo "Building archive"
    pip install pyarrow fastparquet pandas

    rm -rf ${TPCH_SF_OUT} ${TPCH_SF_ARCHIVE}
    mkdir -p ${TPCH_SF_OUT_TBL} ${TPCH_SF_OUT_PARQUET}

    cd ${DBGEN_DIR}
    DSS_PATH=${TPCH_SF_OUT_TBL} ./dbgen -vf -s ${SCALE_FACTOR}

    cd ${TPCH_SF_OUT}
    python3 ${PROJECT_ROOT}/scripts/tpch_parquet.py ${TPCH_SF_OUT_TBL} ${TPCH_SF_OUT_PARQUET}

    cd ${TPCH_DIR}
    tar -cvzf ./${SCALE_FACTOR_DIR}.tgz ./${SCALE_FACTOR_DIR}
fi


