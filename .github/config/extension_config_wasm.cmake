################################################################################
# DuckDB-Wasm extension base config
################################################################################
#
duckdb_extension_load(json DONT_LINK)
duckdb_extension_load(parquet DONT_LINK)
duckdb_extension_load(autocomplete DONT_LINK)

duckdb_extension_load(excel DONT_LINK)
duckdb_extension_load(fts DONT_LINK)
duckdb_extension_load(inet DONT_LINK)
duckdb_extension_load(icu DONT_LINK)
duckdb_extension_load(sqlsmith DONT_LINK)
duckdb_extension_load(tpcds DONT_LINK)
duckdb_extension_load(tpch DONT_LINK)
duckdb_extension_load(visualizer DONT_LINK)

#duckdb_extension_load(httpfs DONT_LINK)

duckdb_extension_load(substrait
    LOAD_TESTS DONT_LINK
    GIT_URL https://github.com/duckdblabs/substrait
    GIT_TAG 5d621b1d7d16fe86f8b1930870c8e6bf05bcb92a
    )
duckdb_extension_load(sqlite_scanner
        DONT_LINK LOAD_TESTS
        GIT_URL https://github.com/duckdblabs/sqlite_scanner
        GIT_TAG 9c38a30be2237456cdcd423d527b96c944158c77
        )
