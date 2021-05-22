#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

UNI_DIR=${PROJECT_ROOT}/data/uni
PARQUETGEN=${PROJECT_ROOT}/target/release/parquetgen

if [ ! -f ${PARQUETGEN} ]; then
    cargo build --release -p parquetgen
fi
echo "PARQUETGEN=${PARQUETGEN}"

if [ ! -f "${UNI_DIR}/studenten.parquet" ]; then
    mkdir -p ${UNI_DIR}
    ${PARQUETGEN} uni -o ${UNI_DIR}
fi
echo "UNI_DIR=${UNI_DIR}"

if [ ! -f "${UNI_DIR}/all.zip" ]; then
    cd ${UNI_DIR}
    zip ./all.zip \
        ./assistenten.parquet \
        ./hoeren.parquet \
        ./professoren.parquet \
        ./pruefen.parquet \
        ./studenten.parquet \
        ./vorlesungen.parquet \
        ./vorraussetzen.parquet
fi
