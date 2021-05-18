#ifndef INCLUDE_DUCKDB_WEB_CSV_TABLE_OPTIONS_H_
#define INCLUDE_DUCKDB_WEB_CSV_TABLE_OPTIONS_H_

#include <iostream>
#include <memory>
#include <optional>
#include <string>

#include "arrow/type_fwd.h"
#include "rapidjson/document.h"

namespace duckdb {
namespace web {
namespace csv {

/// Get the CSV reader options
struct TableReaderOptions {
    /// The schema name
    std::string schema_name = "";
    /// The table name
    std::string table_name = "";
    /// The fields (if any)
    std::vector<std::shared_ptr<arrow::Field>> fields = {};

    /// Read from input stream
    arrow::Status ReadFrom(const rapidjson::Document& doc);
};

}  // namespace csv
}  // namespace web
}  // namespace duckdb

#endif
