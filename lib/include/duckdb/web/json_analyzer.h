#ifndef INCLUDE_DUCKDB_WEB_JSON_ANALYZER_H_
#define INCLUDE_DUCKDB_WEB_JSON_ANALYZER_H_

#include <limits>
#include <memory>
#include <unordered_map>
#include <unordered_set>

#include "arrow/array/builder_nested.h"
#include "arrow/type.h"
#include "arrow/type_traits.h"
#include "duckdb/web/json_parser.h"
#include "duckdb/web/json_table.h"
#include "duckdb/web/reservoir_sample.h"
#include "rapidjson/document.h"

namespace duckdb {
namespace web {
namespace json {

/// Infer the type of a JSON table
arrow::Status InferTableType(std::istream& in, TableType& type);
/// Find the column boundaries of a column-major JSON table
arrow::Status FindColumnBoundaries(std::istream& in, TableType& type);

}  // namespace json
}  // namespace web
}  // namespace duckdb

#endif
