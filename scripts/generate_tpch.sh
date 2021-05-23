#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null
DBGEN_DIR="${PROJECT_ROOT}/submodules/tpch-dbgen/dbgen"
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
