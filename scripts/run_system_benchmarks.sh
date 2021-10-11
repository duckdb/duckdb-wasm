#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null
cd ${PROJECT_ROOT}

${PROJECT_ROOT}/scripts/generate_tpch_tbl.sh 0.01
${PROJECT_ROOT}/scripts/generate_tpch_tbl.sh 0.1
${PROJECT_ROOT}/scripts/generate_tpch_tbl.sh 0.25
${PROJECT_ROOT}/scripts/generate_tpch_tbl.sh 0.5
${PROJECT_ROOT}/scripts/generate_tpch_tbl.sh 1
${PROJECT_ROOT}/scripts/generate_tpch_tbl.sh 10

yarn workspace @duckdb/benchmarks build
yarn workspace @duckdb/benchmarks bench:system:sort:int
# yarn workspace @duckdb/benchmarks bench:system:sum:int
# yarn workspace @duckdb/benchmarks bench:system:sum:csv
# yarn workspace @duckdb/benchmarks bench:system:regex
# yarn workspace @duckdb/benchmarks bench:system:join:2
# yarn workspace @duckdb/benchmarks bench:system:join:3
# yarn workspace @duckdb/benchmarks bench:system:tpch 0.01
# yarn workspace @duckdb/benchmarks bench:system:tpch 0.1
# yarn workspace @duckdb/benchmarks bench:system:tpch 0.25
# yarn workspace @duckdb/benchmarks bench:system:tpch 0.5
# yarn workspace @duckdb/benchmarks bench:system:tpch 1
