#include "duckdb/web/extensions/excel_extension.h"

#include "excel_extension.hpp"

extern "C" void duckdb_web_excel_init(duckdb::DuckDB* db) { db->LoadExtension<duckdb::ExcelExtension>(); }
