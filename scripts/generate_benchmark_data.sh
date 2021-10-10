#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd $(dirname "$BASH_SOURCE[0]") && cd .. && pwd)" &> /dev/null
cd ${PROJECT_ROOT}

# Raw CSVs
${PROJECT_ROOT}/scripts/generate_tpch_tbl.sh 0.01
${PROJECT_ROOT}/scripts/generate_tpch_tbl.sh 0.1
${PROJECT_ROOT}/scripts/generate_tpch_tbl.sh 0.25
${PROJECT_ROOT}/scripts/generate_tpch_tbl.sh 0.5
${PROJECT_ROOT}/scripts/generate_tpch_tbl.sh 1

# Arrow & Parquet
${PROJECT_ROOT}/scripts/generate_tpch_arrow.sh 0.01
${PROJECT_ROOT}/scripts/generate_tpch_arrow.sh 0.1
${PROJECT_ROOT}/scripts/generate_tpch_arrow.sh 0.25
${PROJECT_ROOT}/scripts/generate_tpch_arrow.sh 0.5
${PROJECT_ROOT}/scripts/generate_tpch_arrow.sh 1

# SQLite databases
${PROJECT_ROOT}/scripts/generate_tpch_sqlite.sh 0.01
${PROJECT_ROOT}/scripts/generate_tpch_sqlite.sh 0.1
${PROJECT_ROOT}/scripts/generate_tpch_sqlite.sh 0.25
${PROJECT_ROOT}/scripts/generate_tpch_sqlite.sh 0.5
${PROJECT_ROOT}/scripts/generate_tpch_sqlite.sh 1

# DuckDB databases
${PROJECT_ROOT}/scripts/generate_tpch_duckdb.sh 0.01
${PROJECT_ROOT}/scripts/generate_tpch_duckdb.sh 0.1
${PROJECT_ROOT}/scripts/generate_tpch_duckdb.sh 0.25
${PROJECT_ROOT}/scripts/generate_tpch_duckdb.sh 0.5
${PROJECT_ROOT}/scripts/generate_tpch_duckdb.sh 1
