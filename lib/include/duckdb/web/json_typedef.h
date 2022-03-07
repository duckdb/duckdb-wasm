#ifndef INCLUDE_DUCKDB_WEB_JSON_TYPEDEF_H_
#define INCLUDE_DUCKDB_WEB_JSON_TYPEDEF_H_

#include <memory>
#include <string>

#include "arrow/type.h"
#include "arrow/type_fwd.h"
#include "duckdb/web/json_analyzer.h"
#include "duckdb/web/json_parser.h"
#include "rapidjson/document.h"

namespace duckdb {
namespace web {
namespace json {

/// Read a type
arrow::Result<std::shared_ptr<arrow::DataType>> SQLToArrowType(const rapidjson::Value::ConstObject& obj);
/// Read field from a json object
arrow::Result<std::shared_ptr<arrow::Field>> SQLToArrowField(const rapidjson::Value& obj);
/// Read fields from a json array
arrow::Result<std::vector<std::shared_ptr<arrow::Field>>> SQLToArrowFields(const rapidjson::Value::ConstArray& fields);
/// Serialize a SQL type as string
arrow::Result<rapidjson::Value> WriteSQLType(rapidjson::Document& doc, const duckdb::LogicalType& type);
/// Serialize a SQL type as string
arrow::Result<rapidjson::Value> WriteSQLField(rapidjson::Document& doc, std::string_view name,
                                              const duckdb::LogicalType& type, bool nullable);

}  // namespace json
}  // namespace web
}  // namespace duckdb

#endif
