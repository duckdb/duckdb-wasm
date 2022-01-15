#include "duckdb/web/udf.h"

#include <iostream>
#include <memory>
#include <sstream>
#include <string>

#include "arrow/result.h"
#include "arrow/status.h"
#include "arrow/type.h"
#include "arrow/type_fwd.h"
#include "duckdb/web/insert_options.h"
#include "duckdb/web/json_analyzer.h"
#include "duckdb/web/json_typedef.h"
#include "rapidjson/document.h"
#include "rapidjson/error/en.h"
#include "rapidjson/istreamwrapper.h"

namespace duckdb {
namespace web {

namespace {

enum FieldTag {
    NAME,
    RETURN_TYPE,
    ARGUMENT_TYPES,
    CODE,
};

static std::unordered_map<std::string_view, FieldTag> FIELD_TAGS{{"name", FieldTag::NAME},
                                                                 {"argumentTypes", FieldTag::ARGUMENT_TYPES},
                                                                 {"returnType", FieldTag::RETURN_TYPE},
                                                                 {"code", FieldTag::CODE}};

}  // namespace

/// Read from document
arrow::Status UDFFunctionDefinition::ReadFrom(const rapidjson::Document& doc) {
    if (!doc.IsObject()) return arrow::Status::OK();
    for (auto iter = doc.MemberBegin(); iter != doc.MemberEnd(); ++iter) {
        std::string_view name{iter->name.GetString(), iter->name.GetStringLength()};

        auto tag_iter = FIELD_TAGS.find(name);
        if (tag_iter == FIELD_TAGS.end()) continue;

        switch (tag_iter->second) {
            case FieldTag::NAME:
                ARROW_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                name = {iter->value.GetString(), iter->value.GetStringLength()};
                break;

            case FieldTag::CODE:
                ARROW_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                code = {iter->value.GetString(), iter->value.GetStringLength()};
                break;

            case FieldTag::RETURN_TYPE: {
                ARROW_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kObjectType, name));
                const auto& type_obj = iter->value.GetObject();
                ARROW_ASSIGN_OR_RAISE(return_type, json::ReadType(type_obj));
                break;
            }

            case FieldTag::ARGUMENT_TYPES:
                ARROW_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kArrayType, name));
                const auto& args = iter->value.GetArray();
                for (auto arg_iter = args.begin(); arg_iter != args.end(); ++arg_iter) {
                    ARROW_RETURN_NOT_OK(RequireFieldType(*arg_iter, rapidjson::Type::kObjectType, name));
                    const auto& arg_obj = arg_iter->GetObject();
                    ARROW_ASSIGN_OR_RAISE(auto arg_type, json::ReadType(arg_obj));
                    argument_types.push_back(arg_type);
                }
                break;
        }
    }
    return arrow::Status::OK();
}

}  // namespace web
}  // namespace duckdb
