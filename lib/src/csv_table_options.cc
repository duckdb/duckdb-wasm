#include "duckdb/web/csv_table_options.h"

#include <iostream>
#include <memory>
#include <sstream>
#include <string>

#include "arrow/result.h"
#include "arrow/status.h"
#include "arrow/type.h"
#include "arrow/type_fwd.h"
#include "duckdb/web/json_typedef.h"
#include "rapidjson/document.h"
#include "rapidjson/error/en.h"
#include "rapidjson/istreamwrapper.h"

namespace duckdb {
namespace web {
namespace csv {

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

/// Require a certain field type
arrow::Status RequireFieldType(const rapidjson::Value& value, rapidjson::Type type, std::string_view field) {
    if (value.GetType() != type) {
        std::stringstream msg;
        msg << "type mismatch for field '" << field << "': expected " << GetTypeName(type) << ", received "
            << GetTypeName(value.GetType());
        return arrow::Status(arrow::StatusCode::Invalid, msg.str());
    }
    return arrow::Status::OK();
};

enum FieldTag {
    COLUMNS,
    DELIMITER,
    DETECT,
    ESCAPE,
    HEADER,
    NAME,
    QUOTE,
    SCHEMA,
    SKIP,
};

static std::unordered_map<std::string_view, FieldTag> FIELD_TAGS{
    {"schema", FieldTag::SCHEMA},   {"name", FieldTag::NAME},           {"columns", FieldTag::COLUMNS},
    {"fields", FieldTag::COLUMNS},  {"escape", FieldTag::ESCAPE},       {"quote", FieldTag::QUOTE},
    {"delim", FieldTag::DELIMITER}, {"delimiter", FieldTag::DELIMITER}, {"skip", FieldTag::SKIP},
    {"header", FieldTag::HEADER},   {"auto_detect", FieldTag::DETECT},  {"detect", FieldTag::DETECT},
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
            case FieldTag::COLUMNS: {
                ARROW_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kArrayType, name));
                const auto columns_array = iter->value.GetArray();
                ARROW_ASSIGN_OR_RAISE(columns, json::ReadFields(columns_array));
                break;
            }

            case FieldTag::DELIMITER:
                ARROW_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                delimiter = std::string{iter->value.GetString(), iter->value.GetStringLength()};
                break;

            case FieldTag::ESCAPE:
                ARROW_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                escape = std::string{iter->value.GetString(), iter->value.GetStringLength()};
                break;

            case FieldTag::HEADER:
                ARROW_RETURN_NOT_OK(RequireBoolField(iter->value, name));
                header = iter->value.GetBool();
                break;

            case FieldTag::NAME:
                ARROW_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                table_name = {iter->value.GetString(), iter->value.GetStringLength()};
                break;

            case FieldTag::QUOTE:
                ARROW_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                quote = std::string{iter->value.GetString(), iter->value.GetStringLength()};
                break;

            case FieldTag::SCHEMA:
                ARROW_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                schema_name = {iter->value.GetString(), iter->value.GetStringLength()};
                break;

            case FieldTag::DETECT:
                ARROW_RETURN_NOT_OK(RequireBoolField(iter->value, name));
                auto_detect = iter->value.GetBool();
                break;

            case FieldTag::SKIP:
                ARROW_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kNumberType, name));
                skip = iter->value.GetInt64();
                break;
        }
    }
    return arrow::Status::OK();
}

}  // namespace csv
}  // namespace web
}  // namespace duckdb
