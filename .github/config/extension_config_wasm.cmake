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

#duckdb_extension_load(httpfs DONT_LINK)

duckdb_extension_load(sqlite_scanner
        DONT_LINK LOAD_TESTS
        GIT_URL https://github.com/duckdb/sqlite_scanner
        GIT_TAG 078cd16fbd9a4ff96a71c6f5aafc27343e087cbb
        )

################ SUBSTRAIT
if (NOT WIN32)
    duckdb_extension_load(substrait
            LOAD_TESTS DONT_LINK
            GIT_URL https://github.com/duckdb/substrait
            GIT_TAG e75ba6a9a43d75d8c72ecc38e6f751fd8e3474a0
            )
endif()
