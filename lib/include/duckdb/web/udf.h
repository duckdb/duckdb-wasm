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

struct UDFFunctionDefinition {
    /// The name
    std::string name = "";
    /// The return type
    std::shared_ptr<arrow::DataType> return_type = {};
    /// The arguments
    std::vector<std::shared_ptr<arrow::DataType>> argument_types = {};
    /// The code
    std::string code = "";

    /// Read from a document
    arrow::Status ReadFrom(const rapidjson::Document& doc);
};

}  // namespace web
}  // namespace duckdb

#endif
