#ifndef INCLUDE_DUCKDB_WEB_JSON_PARSER_H_
#define INCLUDE_DUCKDB_WEB_JSON_PARSER_H_

#include <memory>

#include "arrow/array/builder_nested.h"
#include "arrow/type.h"
#include "arrow/type_traits.h"
#include "rapidjson/document.h"

namespace duckdb {
namespace web {
namespace json {

// Default json parser flags
constexpr auto DEFAULT_PARSER_FLAGS = rapidjson::kParseDefaultFlags | rapidjson::kParseIterativeFlag |
                                      rapidjson::kParseCommentsFlag | rapidjson::kParseTrailingCommasFlag |
                                      rapidjson::kParseNanAndInfFlag | rapidjson::kParseEscapedApostropheFlag;

/// An array reader
class ArrayParser {
   protected:
    /// The data type
    std::shared_ptr<arrow::DataType> type_;

   public:
    virtual ~ArrayParser() = default;
    /// Get the current length
    size_t GetLength() { return this->builder()->length(); }
    /// Get the array builder
    virtual std::shared_ptr<arrow::ArrayBuilder> builder() = 0;
    /// Initialize the converter
    virtual arrow::Status Init() { return arrow::Status::OK(); }
    /// Append a value
    virtual arrow::Status AppendValue(const rapidjson::Value& json_obj) = 0;
    /// Append multiple values
    virtual arrow::Status AppendValues(const rapidjson::Value& json_array) = 0;
    /// Append a null value
    arrow::Status AppendNull() { return builder()->AppendNull(); }
    /// Finish the conversion
    virtual arrow::Result<std::shared_ptr<arrow::Array>> Finish() {
        auto builder = this->builder();
        if (builder->length() == 0) {
            // Make sure the builder was initialized
            RETURN_NOT_OK(builder->Resize(1));
        }
        return builder->Finish();
    }

    /// Resolve an array parser
    static arrow::Result<std::shared_ptr<ArrayParser>> Resolve(const std::shared_ptr<arrow::DataType>& type);
};

/// Parse an array from json
arrow::Result<std::shared_ptr<arrow::Array>> ArrayFromJSON(const std::shared_ptr<arrow::DataType>& type,
                                                           std::string_view json);

}  // namespace json
}  // namespace web
}  // namespace duckdb

#endif
