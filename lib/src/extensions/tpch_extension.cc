#include "duckdb/web/extensions/tpch_extension.h"

#include "tpch_extension.hpp"

extern "C" void duckdb_web_tpch_init(duckdb::DuckDB* db) { db->LoadStaticExtension<duckdb::TpchExtension>(); }
