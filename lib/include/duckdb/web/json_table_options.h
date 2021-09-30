#ifndef INCLUDE_DUCKDB_WEB_JSON_TABLE_OPTIONS_H_
#define INCLUDE_DUCKDB_WEB_JSON_TABLE_OPTIONS_H_

#include <iostream>
#include <memory>
#include <optional>
#include <string>

#include "arrow/type_fwd.h"
#include "rapidjson/document.h"

namespace duckdb {
namespace web {
namespace json {

/// Get the table shape
enum TableShape {
    // Unknown table shape
    UNRECOGNIZED,
    // Document is an array of rows.
    // E.g. [{"a":1,"b":2}, {"a":3,"b":4}]
    ROW_ARRAY,
    // Document is an object with column array fields.
    // E.g. {"a":[1,3],"b":[2,4]}
    COLUMN_OBJECT,
};

/// Get the JSON reader options
struct TableReaderOptions {
    /// The schema name
    std::string schema_name = "";
    /// The table name
    std::string table_name = "";
    /// Specified auto-detect?
    std::optional<bool> auto_detect = std::nullopt;
    /// The table shape
    std::optional<TableShape> table_shape = std::nullopt;
    /// Specified columns?
    std::optional<std::vector<std::shared_ptr<arrow::Field>>> columns = std::nullopt;

    /// Read from input stream
    arrow::Status ReadFrom(const rapidjson::Document& doc);
};

}  // namespace json
}  // namespace web
}  // namespace duckdb

#endif
