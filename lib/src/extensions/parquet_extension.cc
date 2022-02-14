#include "duckdb/web/extensions/parquet_extension.h"

#include "parquet-extension.hpp"

extern "C" void duckdb_web_parquet_init(duckdb::DuckDB* db) { db->LoadExtension<duckdb::ParquetExtension>(); }
