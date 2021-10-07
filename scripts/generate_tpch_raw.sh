#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null
TPCH_DBGEN_DIR="${PROJECT_ROOT}/submodules/tpch-dbgen/dbgen"
TPCH_DBGEN=${TPCH_DBGEN_DIR}/dbgen
DATAPREP=${PROJECT_ROOT}/target/release/dataprep
SCALE_FACTOR=${1:-0.01}
SCALE_FACTOR_DIR=${SCALE_FACTOR/./_}
TPCH_DIR=${PROJECT_ROOT}/data/tpch
TPCH_SF_OUT=${TPCH_DIR}/${SCALE_FACTOR_DIR}
TPCH_SF_OUT_TBL=${TPCH_SF_OUT}/tbl
TPCH_SF_OUT_DATA=${TPCH_SF_OUT}/parquet

echo "SCALE_FACTOR=${SCALE_FACTOR}"

if [ ! -f ${TPCH_DBGEN} ]; then
    cd ${TPCH_DBGEN_DIR}
    case "$(uname)" in
        'Linux');;
        'Darwin')
            echo "Patch Makefile"
            sed -i '.bak' -e "s/LINUX/MACOS/g" ./Makefile
            ;; 
    esac
    make -C ${TPCH_DBGEN_DIR} dbgen
fi
chmod +x ${TPCH_DBGEN}
echo "TPCH_DBGEN=${TPCH_DBGEN}"

if [ ! -f ${DATAPREP} ]; then
    cargo build --manifest-path=${PROJECT_ROOT}/Cargo.toml --release -p dataprep
fi
chmod +x ${DATAPREP}
echo "DATAPREP=${DATAPREP}"

mkdir -p ${TPCH_SF_OUT_TBL}
TBL_COUNT=$(find ${TPCH_SF_OUT_TBL} -name "*.tbl" | wc -l)
if [[ ${TBL_COUNT} -ne 8 ]]; then
    cd ${TPCH_DBGEN_DIR}
    DSS_PATH=${TPCH_SF_OUT_TBL} ./dbgen -vf -s ${SCALE_FACTOR}
fi
echo "TPCH_SF_OUT_TBL=${TPCH_SF_OUT_TBL}"

mkdir -p ${TPCH_SF_OUT_DATA}
DATA_COUNT=$(find ${TPCH_SF_OUT_TBL} -name "*.parquet" | wc -l)
if [[ ${DATA_COUNT} -ne 8 ]]; then
    rm -rf ${TPCH_SF_OUT_DATA}/*.parquet
    ${DATAPREP} tpch -i ${TPCH_SF_OUT_TBL} -o ${TPCH_SF_OUT_DATA}
fi
echo "TPCH_SF_OUT_DATA=${TPCH_SF_OUT_DATA}"
