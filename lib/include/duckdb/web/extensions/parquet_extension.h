#ifndef INCLUDE_DUCKDB_WEB_EXTENSIONS_PARQUET_EXTENSION_H_
#define INCLUDE_DUCKDB_WEB_EXTENSIONS_PARQUET_EXTENSION_H_

#include "duckdb/main/database.hpp"

extern "C" void duckdb_web_parquet_init(duckdb::DuckDB* db);

#endif
