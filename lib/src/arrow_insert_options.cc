#include "duckdb/web/arrow_insert_options.h"
#include "duckdb/web/status.h"

#include <iostream>
#include <memory>
#include <sstream>
#include <string>

#include "duckdb/web/json_typedef.h"
#include "rapidjson/document.h"
#include "rapidjson/error/en.h"
#include "rapidjson/istreamwrapper.h"

namespace duckdb {
namespace web {

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
web::Status RequireBoolField(const rapidjson::Value& value, std::string_view name) {
    if (!value.IsBool()) {
        std::stringstream msg;
        msg << "type mismatch for field '" << name << "': expected bool, received " << GetTypeName(value.GetType());
        return web::Status(web::StatusCode::Invalid, msg.str());
    }
    return web::Status::OK();
}

/// Require a certain field type
web::Status RequireFieldType(const rapidjson::Value& value, rapidjson::Type type, std::string_view field) {
    if (value.GetType() != type) {
        std::stringstream msg;
        msg << "type mismatch for field '" << field << "': expected " << GetTypeName(type) << ", received "
            << GetTypeName(value.GetType());
        return web::Status(web::StatusCode::Invalid, msg.str());
    }
    return web::Status::OK();
};

enum FieldTag {
    CREATE,
    NAME,
    SCHEMA,
};

static std::unordered_map<std::string_view, FieldTag> FIELD_TAGS{
    {"create", FieldTag::CREATE},
    {"createNew", FieldTag::CREATE},
    {"name", FieldTag::NAME},
    {"schema", FieldTag::SCHEMA},
};

}  // namespace

/// Read from document
web::Status ArrowInsertOptions::ReadFrom(const rapidjson::Document& doc) {
    if (!doc.IsObject()) return web::Status::OK();
    for (auto iter = doc.MemberBegin(); iter != doc.MemberEnd(); ++iter) {
        std::string_view name{iter->name.GetString(), iter->name.GetStringLength()};

        auto tag_iter = FIELD_TAGS.find(name);
        if (tag_iter == FIELD_TAGS.end()) continue;

        switch (tag_iter->second) {
            case FieldTag::CREATE: {
                WEB_RETURN_NOT_OK(RequireBoolField(iter->value, name));
                create_new = iter->value.GetBool();
                break;
            }
            case FieldTag::NAME:
                WEB_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                table_name = {iter->value.GetString(), iter->value.GetStringLength()};
                break;

            case FieldTag::SCHEMA:
                WEB_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                schema_name = {iter->value.GetString(), iter->value.GetStringLength()};
                break;
        }
    }
    return web::Status::OK();
}

}  // namespace web
}  // namespace duckdb
