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
#include "rapidjson/document.h"

namespace duckdb {
namespace web {
namespace json {

/// A type analyzer
class TypeAnalyzer {
   protected:
    /// The exact data type
    std::shared_ptr<arrow::DataType> type_;

    /// Constructor
    TypeAnalyzer(std::shared_ptr<arrow::DataType> type);

   public:
    /// Virtual destructor
    virtual ~TypeAnalyzer() = default;
    /// Get the type
    auto& type() { return type_; }
    /// Check if a value is of the type
    virtual bool TestValue(const rapidjson::Value& json_value) = 0;
    /// Check if multiple values are of the type
    virtual size_t TestValues(const std::vector<rapidjson::Value>& json_values) = 0;

    /// Resolve a type analyzer
    static std::unique_ptr<TypeAnalyzer> ResolveScalar(std::shared_ptr<arrow::DataType> type);
};

/// A reader event
enum class ReaderEvent {
    NONE,
    KEY,
    NULL_,
    STRING,
    BOOL,
    INT32,
    INT64,
    UINT32,
    UINT64,
    DOUBLE,
    START_OBJECT,
    START_ARRAY,
    END_OBJECT,
    END_ARRAY,
};

/// Get the json reader event name
std::string_view GetReaderEventName(ReaderEvent event);

/// Infer the type of a JSON table
arrow::Status InferTableType(std::istream& in, TableType& type);
/// Find the column boundaries of a column-major JSON table
arrow::Status FindColumnBoundaries(std::istream& in, TableType& type);

}  // namespace json
}  // namespace web
}  // namespace duckdb

#endif
