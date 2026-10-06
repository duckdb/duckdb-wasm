#include "duckdb/web/udf.h"
#include "duckdb/web/status.h"

#include <iostream>
#include <memory>
#include <sstream>
#include <string>

#include "duckdb/web/insert_options.h"
#include "duckdb/web/json_typedef.h"
#include "rapidjson/document.h"
#include "rapidjson/error/en.h"
#include "rapidjson/istreamwrapper.h"

namespace duckdb {
namespace web {

namespace {

enum FieldTag {
    FUNCTION_ID,
    NAME,
    RETURN_TYPE,
};

static std::unordered_map<std::string_view, FieldTag> FIELD_TAGS{
    {"name", FieldTag::NAME}, {"returnType", FieldTag::RETURN_TYPE}, {"functionId", FieldTag::FUNCTION_ID}};

}  // namespace

/// Read from document
web::Status UDFFunctionDeclaration::ReadFrom(const rapidjson::Document& doc) {
    if (!doc.IsObject()) return web::Status::OK();
    for (auto iter = doc.MemberBegin(); iter != doc.MemberEnd(); ++iter) {
        std::string_view field{iter->name.GetString(), iter->name.GetStringLength()};

        auto tag_iter = FIELD_TAGS.find(field);
        if (tag_iter == FIELD_TAGS.end()) continue;

        switch (tag_iter->second) {
            case FieldTag::NAME:
                WEB_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                name = {iter->value.GetString(), iter->value.GetStringLength()};
                break;

            case FieldTag::RETURN_TYPE: {
                WEB_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kObjectType, name));
                const auto& type_obj = iter->value.GetObject();
                WEB_ASSIGN_OR_RAISE(return_type, json::SQLToDuckDBType(type_obj));
                break;
            }

            case FieldTag::FUNCTION_ID:
                WEB_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kNumberType, name));
                function_id = iter->value.GetInt();
                break;
        }
    }
    return web::Status::OK();
}

}  // namespace web
}  // namespace duckdb
