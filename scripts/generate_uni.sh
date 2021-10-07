#!/usr/bin/env bash

set -euo pipefail

trap exit SIGINT

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null

UNI_DIR=${PROJECT_ROOT}/data/uni
DATAPREP=${PROJECT_ROOT}/target/release/dataprep

if [ ! -f ${DATAPREP} ]; then
    cargo build --manifest-path=${PROJECT_ROOT}/Cargo.toml --release -p dataprep
fi
echo "DATAPREP=${DATAPREP}"

if [ ! -f "${UNI_DIR}/studenten.parquet" ]; then
    mkdir -p ${UNI_DIR}
    ${DATAPREP} uni -o ${UNI_DIR}
fi
echo "UNI_DIR=${UNI_DIR}"
