#include "duckdb/web/extensions/excel_extension.h"

#include "excel-extension.hpp"

extern "C" void duckdb_web_excel_init(duckdb::DuckDB* db) { db->LoadExtension<duckdb::EXCELExtension>(); }
