#include <string>
#include "duckdb/web/status.h"

#include "rapidjson/document.h"

namespace duckdb {
namespace web {

/// Get a type name
std::string_view GetTypeName(rapidjson::Type type);
/// Require a boolean field
web::Status RequireBoolField(const rapidjson::Value& value, std::string_view name);
/// Require a certain field type
web::Status RequireFieldType(const rapidjson::Value& value, rapidjson::Type type, std::string_view field);

}  // namespace web
}  // namespace duckdb
