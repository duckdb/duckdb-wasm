#include "duckdb/web/extensions/json_extension.h"

#include "json_extension.hpp"

extern "C" void duckdb_web_json_init(duckdb::DuckDB* db) { db->LoadStaticExtension<duckdb::JsonExtension>(); }
