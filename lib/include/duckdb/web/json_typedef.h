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

/// Read field from a json object
arrow::Result<std::shared_ptr<arrow::Field>> ReadField(const rapidjson::Value& obj);
/// Read fields from a json array
arrow::Result<std::vector<std::shared_ptr<arrow::Field>>> ReadFields(const rapidjson::Value::ConstArray& fields);

}  // namespace json
}  // namespace web
}  // namespace duckdb

#endif
