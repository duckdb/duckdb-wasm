#ifndef INCLUDE_DUCKDB_WEB_UDF_H_
#define INCLUDE_DUCKDB_WEB_UDF_H_

#include <cstdint>
#include <optional>
#include <string>
#include <string_view>

#include "arrow/type_fwd.h"
#include "rapidjson/document.h"

namespace duckdb {
namespace web {

struct UDFFunctionDeclaration {
    /// The name
    std::string name = "";
    /// The function id
    size_t function_id = 0;
    /// The argument count
    size_t argument_count = 0;
    /// The return type
    std::shared_ptr<arrow::DataType> return_type = {};

    /// Read from a document
    arrow::Status ReadFrom(const rapidjson::Document& doc);
};

}  // namespace web
}  // namespace duckdb

#endif
