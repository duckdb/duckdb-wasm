#include "duckdb/web/extensions/parquet_extension.h"

#include "parquet_extension.hpp"

extern "C" void duckdb_web_parquet_init(duckdb::DuckDB* db) { db->LoadStaticExtension<duckdb::ParquetExtension>(); }
