#ifndef INCLUDE_DUCKDB_WEB_EXTENSIONS_FTS_EXTENSION_H_
#define INCLUDE_DUCKDB_WEB_EXTENSIONS_FTS_EXTENSION_H_

#include "duckdb/main/database.hpp"

extern "C" void duckdb_web_fts_init(duckdb::DuckDB* db);

#endif
