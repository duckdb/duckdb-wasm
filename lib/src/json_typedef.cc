#include "duckdb/web/json_typedef.h"
#include "duckdb/web/status.h"

#include "duckdb/common/optional_idx.hpp"


#include <algorithm>
#include <duckdb/common/types.hpp>
#include <iostream>
#include <memory>
#include <optional>
#include <string_view>
#include <unordered_map>
#include <unordered_set>
#include <variant>
#include <vector>

#include "rapidjson/document.h"
#include "rapidjson/istreamwrapper.h"
#include "rapidjson/rapidjson.h"
#include "rapidjson/writer.h"


namespace duckdb {
namespace web {
namespace json {

namespace {

template <typename IntType = int>
Result<IntType> GetIntField(const rapidjson::Value::ConstObject& obj, std::string_view key, int default_value = 0) {
    const auto& it = obj.FindMember(rapidjson::StringRef(key.data(), key.length()));
    if (it == obj.MemberEnd()) return default_value;
    if (!it->value.IsInt()) return Status::Invalid("member is not an integer: ", key);
    return static_cast<IntType>(it->value.GetInt64());
}

Result<bool> GetBoolField(const rapidjson::Value::ConstObject& obj, std::string_view key, bool default_value = false) {
    const auto& it = obj.FindMember(rapidjson::StringRef(key.data(), key.length()));
    if (it == obj.MemberEnd()) return default_value;
    if (!it->value.IsBool()) return Status::Invalid("member is not a boolean: ", key);
    return it->value.GetBool();
}

/// Read an string member
Result<std::string_view> GetStringField(const rapidjson::Value::ConstObject& obj, std::string_view key,
                                        std::string_view default_value = "") {
    const auto& it = obj.FindMember(rapidjson::StringRef(key.data(), key.length()));
    if (it == obj.MemberEnd()) return "";
    if (!it->value.IsString()) return Status::Invalid("member is not a string: ", key);
    return std::string_view{it->value.GetString(), it->value.GetStringLength()};
}

Result<const rapidjson::Value::ConstArray> GetArrayField(const rapidjson::Value::ConstObject& obj, std::string_view key,
                                                         bool allow_absent = false) {
    static const auto empty_array = rapidjson::Value(rapidjson::kArrayType);

    const auto& it = obj.FindMember(rapidjson::StringRef(key.data(), key.length()));
    if (allow_absent && it == obj.MemberEnd()) {
        return empty_array.GetArray();
    }
    if (!it->value.IsArray()) return Status::Invalid("member is not an array: ", key);
    return it->value.GetArray();
}

Result<const rapidjson::Value::ConstObject> GetMemberObject(const rapidjson::Value::ConstObject& obj,
                                                            std::string_view key) {
    const auto& it = obj.FindMember(rapidjson::StringRef(key.data(), key.length()));
    if (!it->value.IsObject()) return Status::Invalid("member is not an object: ", key);
    return it->value.GetObject();
}

}  // namespace

namespace {

Result<LogicalType> ReadDuckDBDecimalType(const rapidjson::Value::ConstObject& obj, int32_t default_precision,
                                          int32_t default_scale) {
    WEB_ASSIGN_OR_RAISE(const int32_t precision, GetIntField<int32_t>(obj, "precision", default_precision));
    WEB_ASSIGN_OR_RAISE(const int32_t scale, GetIntField<int32_t>(obj, "scale", default_scale));
    if (precision <= 0) return Status::Invalid("Decimal precision must be > 0");
    if (scale < 0) return Status::Invalid("Decimal scale must be >= 0");
    return LogicalType::DECIMAL(precision, scale);
}

Result<LogicalType> ReadDuckDBTimestampType(const rapidjson::Value::ConstObject& obj) {
    const auto& it_tz = obj.FindMember("timezone");
    if (it_tz == obj.MemberEnd()) return LogicalType::TIMESTAMP;
    if (!it_tz->value.IsString()) return Status::Invalid("timezone is not a string");
    return LogicalType::TIMESTAMP_TZ;
}

Result<LogicalType> ReadDuckDBListType(const rapidjson::Value::ConstObject& obj) {
    WEB_ASSIGN_OR_RAISE(const auto value, GetMemberObject(obj, "valueType"));
    WEB_ASSIGN_OR_RAISE(const auto value_type, SQLToDuckDBType(value));
    return LogicalType::LIST(value_type);
}

Result<LogicalType> ReadDuckDBArrayType(const rapidjson::Value::ConstObject& obj) {
    WEB_ASSIGN_OR_RAISE(const auto value, GetMemberObject(obj, "valueType"));
    WEB_ASSIGN_OR_RAISE(const auto value_type, SQLToDuckDBType(value));
    WEB_ASSIGN_OR_RAISE(const int32_t list_size, GetIntField<int32_t>(obj, "listSize"));
    if (list_size <= 0) return Status::Invalid("FixedSizeList listSize must be > 0");
    return LogicalType::ARRAY(value_type, list_size);
}

Result<LogicalType> ReadDuckDBMapType(const rapidjson::Value::ConstObject& obj) {
    WEB_ASSIGN_OR_RAISE(const auto key, GetMemberObject(obj, "keyType"));
    WEB_ASSIGN_OR_RAISE(const auto value, GetMemberObject(obj, "valueType"));
    WEB_ASSIGN_OR_RAISE(const auto key_type, SQLToDuckDBType(key));
    WEB_ASSIGN_OR_RAISE(const auto value_type, SQLToDuckDBType(value));
    return LogicalType::MAP(key_type, value_type);
}

Result<LogicalType> ReadDuckDBStructType(const rapidjson::Value::ConstObject& obj) {
    WEB_ASSIGN_OR_RAISE(const auto children, GetArrayField(obj, "fields"));
    WEB_ASSIGN_OR_RAISE(auto children_fields, SQLToDuckDBFields(children));
    return LogicalType::STRUCT(std::move(children_fields));
}

Result<LogicalType> ReadDuckDBUnionType(const rapidjson::Value::ConstObject& obj) {
    WEB_ASSIGN_OR_RAISE(const auto children, GetArrayField(obj, "fields"));
    WEB_ASSIGN_OR_RAISE(auto children_fields, SQLToDuckDBFields(children));
    return LogicalType::UNION(std::move(children_fields));
}

}  // namespace

/// Read a DuckDB type, the type names are the ones arrowToSQLType produces on the JavaScript side
web::Result<duckdb::LogicalType> SQLToDuckDBType(const rapidjson::Value::ConstObject& type) {
    WEB_ASSIGN_OR_RAISE(const auto obj, GetStringField(type, "sqlType", ""));

    using TypeResolver = std::function<Result<LogicalType>(const rapidjson::Value::ConstObject&)>;
    static std::unordered_map<std::string_view, TypeResolver> DUCKDB_TYPE_MAPPING{
        {"binary", [](auto&) { return LogicalType::BLOB; }},
        {"bool", [](auto&) { return LogicalType::BOOLEAN; }},
        {"boolean", [](auto&) { return LogicalType::BOOLEAN; }},
        {"date", [](auto&) { return LogicalType::DATE; }},
        {"date32", [](auto&) { return LogicalType::DATE; }},
        {"date32[d]", [](auto&) { return LogicalType::DATE; }},
        {"date64", [](auto&) { return LogicalType::DATE; }},
        {"date64[ms]", [](auto&) { return LogicalType::DATE; }},
        {"daytimeinterval", [](auto&) { return LogicalType::INTERVAL; }},
        {"decimal", [](auto& o) { return ReadDuckDBDecimalType(o, 0, 0); }},
        {"decimal128", [](auto& o) { return ReadDuckDBDecimalType(o, 0, 0); }},
        {"decimal256", [](auto& o) { return ReadDuckDBDecimalType(o, 12, 2); }},
        {"double", [](auto&) { return LogicalType::DOUBLE; }},
        {"duration", [](auto&) { return LogicalType::INTERVAL; }},
        {"duration[ms]", [](auto&) { return LogicalType::INTERVAL; }},
        {"duration[ns]", [](auto&) { return LogicalType::INTERVAL; }},
        {"duration[s]", [](auto&) { return LogicalType::INTERVAL; }},
        {"duration[us]", [](auto&) { return LogicalType::INTERVAL; }},
        {"fixedsizebinary", [](auto&) { return LogicalType::BLOB; }},
        {"fixedsizelist", &ReadDuckDBArrayType},
        {"float", [](auto&) { return LogicalType::FLOAT; }},
        {"float16", [](auto&) { return LogicalType::FLOAT; }},
        {"float32", [](auto&) { return LogicalType::FLOAT; }},
        {"float64", [](auto&) { return LogicalType::DOUBLE; }},
        {"halffloat", [](auto&) { return LogicalType::FLOAT; }},
        {"int16", [](auto&) { return LogicalType::SMALLINT; }},
        {"int32", [](auto&) { return LogicalType::INTEGER; }},
        {"int64", [](auto&) { return LogicalType::BIGINT; }},
        {"int8", [](auto&) { return LogicalType::TINYINT; }},
        {"interval[dt]", [](auto&) { return LogicalType::INTERVAL; }},
        {"interval[m]", [](auto&) { return LogicalType::INTERVAL; }},
        {"largebinary", [](auto&) { return LogicalType::BLOB; }},
        {"largeutf8", [](auto&) { return LogicalType::VARCHAR; }},
        {"list", &ReadDuckDBListType},
        {"map", &ReadDuckDBMapType},
        {"monthinterval", [](auto&) { return LogicalType::INTERVAL; }},
        {"null", [](auto&) { return LogicalType::SQLNULL; }},
        {"string", [](auto&) { return LogicalType::VARCHAR; }},
        {"struct", &ReadDuckDBStructType},
        {"time", [](auto&) { return LogicalType::TIME; }},
        {"time32[ms]", [](auto&) { return LogicalType::TIME; }},
        {"time32[s]", [](auto&) { return LogicalType::TIME; }},
        {"time64[ns]", [](auto&) { return LogicalType::TIME; }},
        {"time64[us]", [](auto&) { return LogicalType::TIME; }},
        {"time[ms]", [](auto&) { return LogicalType::TIME; }},
        {"time[ns]", [](auto&) { return LogicalType::TIME; }},
        {"time[s]", [](auto&) { return LogicalType::TIME; }},
        {"time[us]", [](auto&) { return LogicalType::TIME; }},
        // All timestamp units map to microseconds, as the Arrow types did before
        {"timestamp", &ReadDuckDBTimestampType},
        {"timestamp[s]", &ReadDuckDBTimestampType},
        {"timestamp[ms]", &ReadDuckDBTimestampType},
        {"timestamp[us]", &ReadDuckDBTimestampType},
        {"timestamp[ns]", &ReadDuckDBTimestampType},
        {"uint16", [](auto&) { return LogicalType::USMALLINT; }},
        {"uint32", [](auto&) { return LogicalType::UINTEGER; }},
        {"uint64", [](auto&) { return LogicalType::UBIGINT; }},
        {"uint8", [](auto&) { return LogicalType::UTINYINT; }},
        {"union", &ReadDuckDBUnionType},
        {"utf8", [](auto&) { return LogicalType::VARCHAR; }},
    };

    std::string objLower{obj.data(), obj.length()};
    std::transform(objLower.begin(), objLower.end(), objLower.begin(), [](unsigned char c) { return std::tolower(c); });
    auto iter = DUCKDB_TYPE_MAPPING.find(objLower);
    if (iter == DUCKDB_TYPE_MAPPING.end()) return Status::Invalid("Unrecognized type name: ", obj);
    return iter->second(type);
}

/// Read DuckDB fields from an array
web::Result<duckdb::child_list_t<duckdb::LogicalType>> SQLToDuckDBFields(const rapidjson::Value::ConstArray& fields) {
    child_list_t<LogicalType> out;
    out.reserve(fields.Size());
    for (const rapidjson::Value& field : fields) {
        if (!field.IsObject()) return Status::Invalid("Field was not a JSON object");
        const auto& field_obj = field.GetObject();
        WEB_ASSIGN_OR_RAISE(auto name, GetStringField(field_obj, "name", ""));
        if (name == "") return Status::Invalid("invalid field name");
        WEB_ASSIGN_OR_RAISE(auto type, SQLToDuckDBType(field_obj));
        out.emplace_back(Identifier(std::string{name}), std::move(type));
    }
    return out;
}

/// Serialize a SQL type as string
web::Result<rapidjson::Value> WriteSQLType(rapidjson::Document& doc, const duckdb::LogicalType& type) {
    auto& alloc = doc.GetAllocator();
    rapidjson::Value out(rapidjson::kObjectType);
    switch (type.id()) {
        case duckdb::LogicalTypeId::UNBOUND:
        case duckdb::LogicalTypeId::GEOMETRY:
        case duckdb::LogicalTypeId::TYPE:
            throw "unsupported type";
        case duckdb::LogicalTypeId::INVALID:
            out.AddMember("sqlType", "invalid", alloc);
            break;
        case duckdb::LogicalTypeId::SQLNULL:
            out.AddMember("sqlType", "null", alloc);
            break;
        case duckdb::LogicalTypeId::UNKNOWN:
            out.AddMember("sqlType", "unknown", alloc);
            break;
        case duckdb::LogicalTypeId::ANY:
            out.AddMember("sqlType", "any", alloc);
            break;
        case duckdb::LogicalTypeId::BOOLEAN:
            out.AddMember("sqlType", "bool", alloc);
            break;
        case duckdb::LogicalTypeId::TINYINT:
            out.AddMember("sqlType", "int8", alloc);
            break;
        case duckdb::LogicalTypeId::SMALLINT:
            out.AddMember("sqlType", "int16", alloc);
            break;
        case duckdb::LogicalTypeId::INTEGER:
            out.AddMember("sqlType", "int32", alloc);
            break;
        case duckdb::LogicalTypeId::BIGINT:
            out.AddMember("sqlType", "int64", alloc);
            break;
        case duckdb::LogicalTypeId::DATE:
            out.AddMember("sqlType", "date32[d]", alloc);
            break;
        case duckdb::LogicalTypeId::TIME:
            out.AddMember("sqlType", "time[us]", alloc);
            break;
        case duckdb::LogicalTypeId::TIMESTAMP_SEC:
            out.AddMember("sqlType", "timestamp[s]", alloc);
            break;
        case duckdb::LogicalTypeId::TIMESTAMP_MS:
            out.AddMember("sqlType", "timestamp[ms]", alloc);
            break;
        case duckdb::LogicalTypeId::TIMESTAMP:
            out.AddMember("sqlType", "timestamp", alloc);
            break;
        case duckdb::LogicalTypeId::TIMESTAMP_NS:
            out.AddMember("sqlType", "timestamp[ns]", alloc);
            break;
        case duckdb::LogicalTypeId::FLOAT:
            out.AddMember("sqlType", "float", alloc);
            break;
        case duckdb::LogicalTypeId::DOUBLE:
            out.AddMember("sqlType", "double", alloc);
            break;
        case duckdb::LogicalTypeId::VARCHAR:
            out.AddMember("sqlType", "utf8", alloc);
            break;
        case duckdb::LogicalTypeId::STRUCT: {
            out.AddMember("sqlType", "struct", alloc);
            rapidjson::Value children(rapidjson::kArrayType);
            for (auto& child : duckdb::StructType::GetChildTypes(type)) {
                WEB_ASSIGN_OR_RAISE(auto field, WriteSQLField(doc, child.first.GetIdentifierName(), child.second, true));
                children.PushBack(field, alloc);
            }
            out.AddMember("fields", children, alloc);
            break;
        }
        case duckdb::LogicalTypeId::LIST: {
            out.AddMember("sqlType", "list", alloc);
            rapidjson::Value children(rapidjson::kArrayType);
            WEB_ASSIGN_OR_RAISE(auto value, WriteSQLType(doc, duckdb::ListType::GetChildType(type)));
            out.AddMember("valueType", value, alloc);
            break;
        }
        case duckdb::LogicalTypeId::MAP: {
            out.AddMember("sqlType", "map", alloc);
            rapidjson::Value children(rapidjson::kArrayType);
            WEB_ASSIGN_OR_RAISE(auto key, WriteSQLType(doc, duckdb::MapType::KeyType(type)));
            WEB_ASSIGN_OR_RAISE(auto value, WriteSQLType(doc, duckdb::MapType::ValueType(type)));
            out.AddMember("keyType", key, alloc);
            out.AddMember("valueType", value, alloc);
            break;
        }
        case duckdb::LogicalTypeId::DECIMAL:
        case duckdb::LogicalTypeId::INTERVAL:
        case duckdb::LogicalTypeId::UTINYINT:
        case duckdb::LogicalTypeId::USMALLINT:
        case duckdb::LogicalTypeId::UINTEGER:
        case duckdb::LogicalTypeId::UBIGINT:
        case duckdb::LogicalTypeId::TIMESTAMP_TZ:
        case duckdb::LogicalTypeId::TIME_TZ:
        case duckdb::LogicalTypeId::HUGEINT:
        case duckdb::LogicalTypeId::POINTER:
        case duckdb::LogicalTypeId::VALIDITY:
        case duckdb::LogicalTypeId::UUID:
        case duckdb::LogicalTypeId::ENUM:
        case duckdb::LogicalTypeId::BLOB:
        case duckdb::LogicalTypeId::CHAR:
        case duckdb::LogicalTypeId::TABLE:
        case duckdb::LogicalTypeId::BIT:
        case duckdb::LogicalTypeId::LAMBDA:
        case duckdb::LogicalTypeId::STRING_LITERAL:
        case duckdb::LogicalTypeId::INTEGER_LITERAL:
        case duckdb::LogicalTypeId::UHUGEINT:
        case duckdb::LogicalTypeId::UNION:
        case duckdb::LogicalTypeId::ARRAY:
        case duckdb::LogicalTypeId::BIGNUM:
        case duckdb::LogicalTypeId::VARIANT:
        case duckdb::LogicalTypeId::TEMPLATE:
        case duckdb::LogicalTypeId::TIME_NS:
        default:
            break;
    }
    return out;
}

web::Result<rapidjson::Value> WriteSQLField(rapidjson::Document& doc, std::string_view name,
                                              const duckdb::LogicalType& type, bool nullable) {
    auto& alloc = doc.GetAllocator();
    WEB_ASSIGN_OR_RAISE(auto out, WriteSQLType(doc, type));
    out.AddMember("name", rapidjson::StringRef(name.data(), name.length()), alloc);
    return out;
}

}  // namespace json
}  // namespace web
}  // namespace duckdb
