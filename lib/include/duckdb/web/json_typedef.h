#ifndef INCLUDE_DUCKDB_WEB_JSON_TYPEDEF_H_
#define INCLUDE_DUCKDB_WEB_JSON_TYPEDEF_H_

#include <memory>
#include "duckdb/web/status.h"
#include <string>

#include "duckdb/common/types.hpp"
#include "rapidjson/document.h"

namespace duckdb {
namespace web {
namespace json {

/// Read a DuckDB type
web::Result<duckdb::LogicalType> SQLToDuckDBType(const rapidjson::Value::ConstObject& obj);
/// Read DuckDB fields from a json array
web::Result<duckdb::child_list_t<duckdb::LogicalType>> SQLToDuckDBFields(const rapidjson::Value::ConstArray& fields);
/// Serialize a SQL type as string
web::Result<rapidjson::Value> WriteSQLType(rapidjson::Document& doc, const duckdb::LogicalType& type);
/// Serialize a SQL type as string
web::Result<rapidjson::Value> WriteSQLField(rapidjson::Document& doc, std::string_view name,
                                              const duckdb::LogicalType& type, bool nullable);

}  // namespace json
}  // namespace web
}  // namespace duckdb

#endif
