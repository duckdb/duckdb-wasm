#define RAPIDJSON_HAS_STDSTRING 1

#ifndef INCLUDE_DUCKDB_WEB_JSON_DATAVIEW_H_
#define INCLUDE_DUCKDB_WEB_JSON_DATAVIEW_H_

#include <duckdb/common/types/data_chunk.hpp>
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

typedef vector<unique_ptr<data_t[]>> additional_buffers_t;

/// Serialize a DuckDB Vector as JSON data view
arrow::Result<rapidjson::Value> CreateDataView(rapidjson::Document& doc, duckdb::DataChunk& chunk,
                                               additional_buffers_t& buffers);

}  // namespace json
}  // namespace web
}  // namespace duckdb

#endif
