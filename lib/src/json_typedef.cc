#include "duckdb/web/json_typedef.h"

#include <arrow/result.h>

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

#include "arrow/status.h"
#include "arrow/type.h"
#include "arrow/type_fwd.h"
#include "arrow/type_traits.h"
#include "arrow/util/value_parsing.h"
#include "duckdb/web/json_parser.h"
#include "rapidjson/document.h"
#include "rapidjson/istreamwrapper.h"
#include "rapidjson/rapidjson.h"
#include "rapidjson/writer.h"

using namespace arrow;

namespace duckdb {
namespace web {
namespace json {

Result<std::vector<std::shared_ptr<arrow::Field>>> SQLToArrowFields(const rapidjson::Value::ConstArray& fields);

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

Result<std::shared_ptr<DataType>> ReadMapType(const rapidjson::Value::ConstObject& obj) {
    ARROW_ASSIGN_OR_RAISE(const auto key, GetMemberObject(obj, "keyType"));
    ARROW_ASSIGN_OR_RAISE(const auto key_type, SQLToArrowType(key));
    ARROW_ASSIGN_OR_RAISE(const auto value, GetMemberObject(obj, "valueType"));
    ARROW_ASSIGN_OR_RAISE(const auto value_type, SQLToArrowType(value));
    ARROW_ASSIGN_OR_RAISE(const bool keys_sorted, GetBoolField(obj, "keysSorted", false));
    return arrow::MapType::Make(arrow::field("entry",
                                             arrow::struct_({
                                                 arrow::field("key", key_type, false),
                                                 arrow::field("value", value_type),
                                             }),
                                             false),
                                keys_sorted);
}

Result<std::shared_ptr<DataType>> ReadFixedSizeBinaryType(const rapidjson::Value::ConstObject& obj) {
    ARROW_ASSIGN_OR_RAISE(const int32_t byte_width, GetIntField<int32_t>(obj, "byteWidth", 0));
    if (byte_width == 0) return Status::Invalid("FixedSizeBinary byteLength must be > 0");
    return fixed_size_binary(byte_width);
}

Result<std::shared_ptr<DataType>> ReadFixedSizeListType(const rapidjson::Value::ConstObject& obj) {
    ARROW_ASSIGN_OR_RAISE(const auto value, GetMemberObject(obj, "valueType"));
    ARROW_ASSIGN_OR_RAISE(const auto value_type, SQLToArrowType(value));
    ARROW_ASSIGN_OR_RAISE(const int32_t list_size, GetIntField<int32_t>(obj, "listSize"));
    if (list_size == 0) return Status::Invalid("FixedSizeList listSize must be > 0");
    return fixed_size_list(arrow::field("value", value_type), list_size);
}

Result<std::shared_ptr<DataType>> ReadListType(const rapidjson::Value::ConstObject& obj) {
    ARROW_ASSIGN_OR_RAISE(const auto value, GetMemberObject(obj, "valueType"));
    ARROW_ASSIGN_OR_RAISE(const auto value_type, SQLToArrowType(value));
    return list(arrow::field("value", value_type));
}

Result<std::shared_ptr<DataType>> ReadDecimalType(const rapidjson::Value::ConstObject& obj) {
    ARROW_ASSIGN_OR_RAISE(const int32_t precision, GetIntField<int32_t>(obj, "precision"));
    ARROW_ASSIGN_OR_RAISE(const int32_t scale, GetIntField<int32_t>(obj, "scale"));
    if (precision <= 0) return Status::Invalid("Decimal precision must be > 0");
    if (scale < 0) return Status::Invalid("Decimal scale must be >= 0");
    return decimal(precision, scale);
}

Result<std::shared_ptr<DataType>> ReadDecimal128Type(const rapidjson::Value::ConstObject& obj) {
    ARROW_ASSIGN_OR_RAISE(const int32_t precision, GetIntField<int32_t>(obj, "precision"));
    ARROW_ASSIGN_OR_RAISE(const int32_t scale, GetIntField<int32_t>(obj, "scale"));
    if (precision <= 0) return Status::Invalid("Decimal128 precision must be > 0");
    if (scale < 0) return Status::Invalid("Decimal128 scale must be >= 0");
    return decimal128(precision, scale);
}

Result<std::shared_ptr<DataType>> ReadDecimal256Type(const rapidjson::Value::ConstObject& obj) {
    ARROW_ASSIGN_OR_RAISE(const int32_t precision, GetIntField<int32_t>(obj, "precision", 12));
    ARROW_ASSIGN_OR_RAISE(const int32_t scale, GetIntField<int32_t>(obj, "scale", 2));
    if (precision <= 0) return Status::Invalid("Decimal256 precision must be > 0");
    if (scale < 0) return Status::Invalid("Decimal256 scale must be >= 0");
    return decimal256(precision, scale);
}

Result<std::shared_ptr<DataType>> ReadTimestampType(const rapidjson::Value::ConstObject& obj, TimeUnit::type unit) {
    const auto& it_tz = obj.FindMember("timezone");
    if (it_tz == obj.MemberEnd()) {
        return timestamp(unit);
    } else {
        if (!it_tz->value.IsString()) return Status::Invalid("timezone is not a string");
        return timestamp(unit, it_tz->value.GetString());
    }
}

Result<std::shared_ptr<DataType>> ReadStructType(const rapidjson::Value::ConstObject& obj) {
    ARROW_ASSIGN_OR_RAISE(const auto children, GetArrayField(obj, "fields"));
    ARROW_ASSIGN_OR_RAISE(const auto children_fields, SQLToArrowFields(children));
    return arrow::struct_(std::move(children_fields));
}

Result<std::shared_ptr<DataType>> ReadUnionType(const rapidjson::Value::ConstObject& obj) {
    ARROW_ASSIGN_OR_RAISE(const auto children, GetArrayField(obj, "fields"));
    ARROW_ASSIGN_OR_RAISE(const auto children_fields, SQLToArrowFields(children));

    // Read the mode
    ARROW_ASSIGN_OR_RAISE(const auto mode_str, GetStringField(obj, "mode"));
    UnionMode::type mode;
    if (mode_str == "SPARSE") {
        mode = UnionMode::SPARSE;
    } else if (mode_str == "DENSE") {
        mode = UnionMode::DENSE;
    } else {
        return Status::Invalid("Invalid union mode: ", mode_str);
    }

    // Read the type ids
    ARROW_ASSIGN_OR_RAISE(const auto obj_codes, GetArrayField(obj, "typeIds"));
    std::vector<int8_t> type_codes;
    type_codes.reserve(obj_codes.Size());
    for (const rapidjson::Value& val : obj_codes) {
        if (!val.IsInt()) {
            return Status::Invalid("Union type codes must be integers");
        }
        type_codes.push_back(static_cast<int8_t>(val.GetInt()));
    }

    // Build the type
    if (mode == UnionMode::SPARSE) {
        return sparse_union(std::move(children_fields), std::move(type_codes));
    } else {
        return dense_union(std::move(children_fields), std::move(type_codes));
    }
}

}  // namespace

/// Read a type
arrow::Result<std::shared_ptr<arrow::DataType>> SQLToArrowType(const rapidjson::Value::ConstObject& type) {
    ARROW_ASSIGN_OR_RAISE(const auto obj, GetStringField(type, "sqlType", ""));

    using TypeResolver =
        std::function<arrow::Result<std::shared_ptr<arrow::DataType>>(const rapidjson::Value::ConstObject&)>;
    static std::unordered_map<std::string_view, TypeResolver> ARROW_TYPE_MAPPING{
        {"binary", [](auto&) { return arrow::binary(); }},
        {"bool", [](auto&) { return arrow::boolean(); }},
        {"boolean", [](auto&) { return arrow::boolean(); }},
        {"date", [](auto&) { return arrow::date64(); }},
        {"date32", [](auto&) { return arrow::date32(); }},
        {"date32[d]", [](auto&) { return arrow::date32(); }},
        {"date64", [](auto&) { return arrow::date64(); }},
        {"date64[ms]", [](auto&) { return arrow::date64(); }},
        {"daytimeinterval", [](auto&) { return arrow::day_time_interval(); }},
        {"decimal", &ReadDecimalType},
        {"decimal128", &ReadDecimal128Type},
        {"decimal256", &ReadDecimal256Type},
        {"double", [](auto&) { return arrow::float64(); }},
        {"duration", [](auto&) { return arrow::duration(TimeUnit::MILLI); }},
        {"duration[ms]", [](auto&) { return arrow::duration(TimeUnit::MILLI); }},
        {"duration[ns]", [](auto&) { return arrow::duration(TimeUnit::NANO); }},
        {"duration[s]", [](auto&) { return arrow::duration(TimeUnit::SECOND); }},
        {"duration[us]", [](auto&) { return arrow::duration(TimeUnit::MICRO); }},
        {"fixedsizebinary", &ReadFixedSizeBinaryType},
        {"fixedsizelist", &ReadFixedSizeListType},
        {"float", [](auto&) { return arrow::float32(); }},
        {"float16", [](auto&) { return arrow::float16(); }},
        {"float32", [](auto&) { return arrow::float32(); }},
        {"float64", [](auto&) { return arrow::float64(); }},
        {"halffloat", [](auto&) { return arrow::float16(); }},
        {"int16", [](auto&) { return arrow::int16(); }},
        {"int32", [](auto&) { return arrow::int32(); }},
        {"int64", [](auto&) { return arrow::int64(); }},
        {"int8", [](auto&) { return arrow::int8(); }},
        {"interval[dt]", [](auto&) { return arrow::day_time_interval(); }},
        {"interval[m]", [](auto&) { return arrow::month_interval(); }},
        {"largebinary", [](auto&) { return arrow::large_binary(); }},
        {"largeutf8", [](auto&) { return arrow::large_utf8(); }},
        {"list", &ReadListType},
        {"map", &ReadMapType},
        {"monthinterval", [](auto&) { return arrow::month_interval(); }},
        {"null", [](auto&) { return arrow::null(); }},
        {"string", [](auto&) { return arrow::utf8(); }},
        {"struct", &ReadStructType},
        {"time", [](auto&) { return arrow::time32(TimeUnit::SECOND); }},
        {"time32[ms]", [](auto&) { return arrow::time32(TimeUnit::MILLI); }},
        {"time32[s]", [](auto&) { return arrow::time32(TimeUnit::SECOND); }},
        {"time64[ns]", [](auto&) { return arrow::time64(TimeUnit::NANO); }},
        {"time64[us]", [](auto&) { return arrow::time64(TimeUnit::MICRO); }},
        {"time[ms]", [](auto&) { return arrow::time32(TimeUnit::MILLI); }},
        {"time[ns]", [](auto&) { return arrow::time64(TimeUnit::NANO); }},
        {"time[s]", [](auto&) { return arrow::time32(TimeUnit::SECOND); }},
        {"time[us]", [](auto&) { return arrow::time64(TimeUnit::MICRO); }},
        {"timestamp", [](auto& o) { return ReadTimestampType(o, TimeUnit::SECOND); }},
        {"timestamp[s]", [](auto& o) { return ReadTimestampType(o, TimeUnit::SECOND); }},
        {"timestamp[ms]", [](auto& o) { return ReadTimestampType(o, TimeUnit::MILLI); }},
        {"timestamp[us]", [](auto& o) { return ReadTimestampType(o, TimeUnit::MICRO); }},
        {"timestamp[ns]", [](auto& o) { return ReadTimestampType(o, TimeUnit::NANO); }},
        {"uint16", [](auto&) { return arrow::uint16(); }},
        {"uint32", [](auto&) { return arrow::uint32(); }},
        {"uint64", [](auto&) { return arrow::uint64(); }},
        {"uint8", [](auto&) { return arrow::uint8(); }},
        {"union", &ReadUnionType},
        {"utf8", [](auto&) { return arrow::utf8(); }},
    };

    // Get type resolver
    std::string objLower{obj.data(), obj.length()};
    std::transform(objLower.begin(), objLower.end(), objLower.begin(), [](unsigned char c) { return std::tolower(c); });
    auto iter = ARROW_TYPE_MAPPING.find(objLower);
    if (iter == ARROW_TYPE_MAPPING.end()) return Status::Invalid("Unrecognized type name: ", obj);
    ARROW_ASSIGN_OR_RAISE(const auto mapped, iter->second(type));
    return mapped;
}

/// Read a field
arrow::Result<std::shared_ptr<Field>> SQLToArrowField(const rapidjson::Value& field) {
    if (!field.IsObject()) {
        return Status::Invalid("Field was not a JSON object");
    }
    const auto& field_obj = field.GetObject();
    ARROW_ASSIGN_OR_RAISE(auto name, GetStringField(field_obj, "name", ""));
    ARROW_ASSIGN_OR_RAISE(auto nullable, GetBoolField(field_obj, "nullable", true));
    ARROW_ASSIGN_OR_RAISE(auto type, SQLToArrowType(field_obj));

    if (name == "") return Status::Invalid("invalid field name");
    return arrow::field(std::string{name}, type, nullable);
}

/// Read fields from an array
Result<std::vector<std::shared_ptr<arrow::Field>>> SQLToArrowFields(const rapidjson::Value::ConstArray& fields) {
    std::vector<std::shared_ptr<arrow::Field>> out;
    out.resize(fields.Size());
    for (rapidjson::SizeType i = 0; i < fields.Size(); ++i) {
        ARROW_ASSIGN_OR_RAISE(out[i], SQLToArrowField(fields[i]));
    }
    return std::move(out);
}

/// Serialize a SQL type as string
arrow::Result<rapidjson::Value> WriteSQLType(rapidjson::Document& doc, const duckdb::LogicalType& type) {
    auto& alloc = doc.GetAllocator();
    rapidjson::Value out(rapidjson::kObjectType);
    switch (type.id()) {
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
        case duckdb::LogicalTypeId::USER:
            out.AddMember("sqlType", "user", alloc);
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
                ARROW_ASSIGN_OR_RAISE(auto field, WriteSQLField(doc, child.first, child.second, true));
                children.PushBack(field, alloc);
            }
            out.AddMember("fields", children, alloc);
            break;
        }
        case duckdb::LogicalTypeId::LIST: {
            out.AddMember("sqlType", "list", alloc);
            rapidjson::Value children(rapidjson::kArrayType);
            ARROW_ASSIGN_OR_RAISE(auto value, WriteSQLType(doc, duckdb::ListType::GetChildType(type)));
            out.AddMember("valueType", value, alloc);
            break;
        }
        case duckdb::LogicalTypeId::MAP: {
            out.AddMember("sqlType", "map", alloc);
            rapidjson::Value children(rapidjson::kArrayType);
            ARROW_ASSIGN_OR_RAISE(auto key, WriteSQLType(doc, duckdb::MapType::KeyType(type)));
            ARROW_ASSIGN_OR_RAISE(auto value, WriteSQLType(doc, duckdb::MapType::ValueType(type)));
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
        case duckdb::LogicalTypeId::AGGREGATE_STATE:
        case duckdb::LogicalTypeId::BIT:
        case duckdb::LogicalTypeId::LAMBDA:
        case duckdb::LogicalTypeId::STRING_LITERAL:
        case duckdb::LogicalTypeId::INTEGER_LITERAL:
        case duckdb::LogicalTypeId::UHUGEINT:
        case duckdb::LogicalTypeId::UNION:
        case duckdb::LogicalTypeId::ARRAY:
        case duckdb::LogicalTypeId::VARINT:
            break;
    }
    return out;
}

arrow::Result<rapidjson::Value> WriteSQLField(rapidjson::Document& doc, std::string_view name,
                                              const duckdb::LogicalType& type, bool nullable) {
    auto& alloc = doc.GetAllocator();
    ARROW_ASSIGN_OR_RAISE(auto out, WriteSQLType(doc, type));
    out.AddMember("name", rapidjson::StringRef(name.data(), name.length()), alloc);
    return out;
}

}  // namespace json
}  // namespace web
}  // namespace duckdb
