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
    /// Contains header?
    std::optional<bool> header = std::nullopt;
    /// Specified delimiter?
    std::optional<std::string> delimiter = std::nullopt;
    /// Specified quote?
    std::optional<std::string> quote = std::nullopt;
    /// Specified escape?
    std::optional<std::string> escape = std::nullopt;
    /// Specified skip?
    std::optional<int64_t> skip = std::nullopt;
    /// Specified auto-detect?
    std::optional<bool> auto_detect = std::nullopt;
    /// Specified columns?
    std::optional<std::vector<std::shared_ptr<arrow::Field>>> columns = std::nullopt;

    /// Read from input stream
    arrow::Status ReadFrom(const rapidjson::Document& doc);
};

}  // namespace csv
}  // namespace web
}  // namespace duckdb

#endif
