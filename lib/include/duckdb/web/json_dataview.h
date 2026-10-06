#define RAPIDJSON_HAS_STDSTRING 1

#ifndef INCLUDE_DUCKDB_WEB_JSON_DATAVIEW_H_
#define INCLUDE_DUCKDB_WEB_JSON_DATAVIEW_H_

#include <duckdb/common/types/data_chunk.hpp>
#include "duckdb/web/status.h"
#include <memory>
#include <string>

#include "rapidjson/document.h"

namespace duckdb {
namespace web {
namespace json {

typedef vector<unique_ptr<data_t[]>> additional_buffers_t;

/// Serialize a DuckDB Vector as JSON data view
web::Result<rapidjson::Value> CreateDataView(rapidjson::Document& doc, duckdb::DataChunk& chunk,
                                               std::vector<double>& data_ptrs, additional_buffers_t& buffers);

}  // namespace json
}  // namespace web
}  // namespace duckdb

#endif
