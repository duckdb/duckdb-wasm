#include <string>

#include "arrow/ipc/reader.h"
#include "arrow/type.h"
#include "arrow/type_fwd.h"
#include "duckdb/web/arrow_stream_buffer.h"
#include "rapidjson/document.h"

namespace duckdb {
namespace web {

/// Get a type name
std::string_view GetTypeName(rapidjson::Type type);
/// Require a boolean field
arrow::Status RequireBoolField(const rapidjson::Value& value, std::string_view name);
/// Require a certain field type
arrow::Status RequireFieldType(const rapidjson::Value& value, rapidjson::Type type, std::string_view field);

}  // namespace web
}  // namespace duckdb
