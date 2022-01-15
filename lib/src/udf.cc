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
    ARGUMENT_TYPE,
    CODE,
};

static std::unordered_map<std::string_view, FieldTag> FIELD_TAGS{{"name", FieldTag::NAME},
                                                                 {"argumentTypes", FieldTag::ARGUMENT_TYPE},
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
                // XXX Parse more
        }
    }
    return arrow::Status::OK();
}

}  // namespace web
}  // namespace duckdb
