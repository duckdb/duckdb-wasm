#ifndef INCLUDE_DUCKDB_WEB_ARROW_INSERT_OPTIONS_H_
#define INCLUDE_DUCKDB_WEB_ARROW_INSERT_OPTIONS_H_

#include <iostream>
#include <memory>
#include <optional>
#include <string>

#include "arrow/type_fwd.h"
#include "rapidjson/document.h"

namespace duckdb {
namespace web {

/// Get the CSV reader options
struct ArrowInsertOptions {
    /// The schema name
    std::string schema_name = "";
    /// The table name
    std::string table_name = "";
    /// Create a new table?
    bool create_new = false;

    /// Read from input stream
    arrow::Status ReadFrom(const rapidjson::Document& doc);
};

}  // namespace web
}  // namespace duckdb

#endif
