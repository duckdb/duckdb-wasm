#include "duckdb/web/json_table_options.h"

#include <iostream>
#include <memory>
#include <sstream>
#include <string>

#include "arrow/result.h"
#include "arrow/status.h"
#include "arrow/type.h"
#include "arrow/type_fwd.h"
#include "duckdb/web/json_analyzer.h"
#include "duckdb/web/json_typedef.h"
#include "rapidjson/document.h"
#include "rapidjson/error/en.h"
#include "rapidjson/istreamwrapper.h"

namespace duckdb {
namespace web {
namespace json {

namespace {

/// Get a type name
std::string_view GetTypeName(rapidjson::Type type) {
    switch (type) {
        case rapidjson::Type::kArrayType:
            return "array";
        case rapidjson::Type::kTrueType:;
        case rapidjson::Type::kFalseType:
            return "boolean";
        case rapidjson::Type::kNumberType:
            return "number";
        case rapidjson::Type::kObjectType:
            return "object";
        case rapidjson::Type::kNullType:
            return "null";
        case rapidjson::Type::kStringType:
            return "string";
        default:
            return "?";
    }
}

/// Require a boolean field
arrow::Status RequireBoolField(const rapidjson::Value& value, std::string_view name) {
    if (!value.IsBool()) {
        std::stringstream msg;
        msg << "type mismatch for field '" << name << "': expected bool, received " << GetTypeName(value.GetType());
        return arrow::Status(arrow::StatusCode::Invalid, msg.str());
    }
    return arrow::Status::OK();
}

/// Requite a certain field type
arrow::Status RequireFieldType(const rapidjson::Value& value, rapidjson::Type type, std::string_view field) {
    if (value.GetType() != type) {
        std::stringstream msg;
        msg << "type mismatch for field '" << field << "': expected " << GetTypeName(type) << ", received "
            << GetTypeName(value.GetType());
        return arrow::Status(arrow::StatusCode::Invalid, msg.str());
    }
    return arrow::Status::OK();
};

enum FieldTag { SCHEMA, NAME, FORMAT, COLUMNS, DETECT };

static std::unordered_map<std::string_view, FieldTag> FIELD_TAGS{
    {"schema", FieldTag::SCHEMA},   {"name", FieldTag::NAME},     {"format", FieldTag::FORMAT},
    {"columns", FieldTag::COLUMNS}, {"detect", FieldTag::DETECT}, {"autoDetect", FieldTag::DETECT},
};

static std::unordered_map<std::string_view, TableShape> FORMATS{
    {"row-array", TableShape::ROW_ARRAY},
    {"column-object", TableShape::COLUMN_OBJECT},
};

}  // namespace

/// Read from document
arrow::Status TableReaderOptions::ReadFrom(const rapidjson::Document& doc) {
    if (!doc.IsObject()) return arrow::Status::OK();
    for (auto iter = doc.MemberBegin(); iter != doc.MemberEnd(); ++iter) {
        std::string_view name{iter->name.GetString(), iter->name.GetStringLength()};

        auto tag_iter = FIELD_TAGS.find(name);
        if (tag_iter == FIELD_TAGS.end()) continue;

        switch (tag_iter->second) {
            case FieldTag::SCHEMA:
                ARROW_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                schema_name = {iter->value.GetString(), iter->value.GetStringLength()};
                break;

            case FieldTag::NAME:
                ARROW_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                table_name = {iter->value.GetString(), iter->value.GetStringLength()};
                break;

            case FieldTag::DETECT:
                ARROW_RETURN_NOT_OK(RequireBoolField(iter->value, name));
                auto_detect = iter->value.GetBool();
                break;

            case FieldTag::FORMAT: {
                ARROW_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                auto format_iter =
                    FORMATS.find(std::string_view{iter->value.GetString(), iter->value.GetStringLength()});
                if (format_iter == FORMATS.end()) {
                    return arrow::Status::Invalid("unknown table format: ", iter->value.GetString());
                }
                table_shape = format_iter->second;
                continue;
            }

            case FieldTag::COLUMNS: {
                ARROW_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kArrayType, name));
                const auto columns_array = iter->value.GetArray();
                ARROW_ASSIGN_OR_RAISE(columns, ReadFields(columns_array));
                continue;
            }
        }
    }
    return arrow::Status::OK();
}

}  // namespace json
}  // namespace web
}  // namespace duckdb
