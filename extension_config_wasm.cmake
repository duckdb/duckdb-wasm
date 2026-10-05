################################################################################
# DuckDB-Wasm extension base config
################################################################################
#

duckdb_extension_load(json)
duckdb_extension_load(parquet)
duckdb_extension_load(autocomplete)

duckdb_extension_load(icu)
duckdb_extension_load(tpcds)
duckdb_extension_load(tpch)

#duckdb_extension_load(httpfs)

