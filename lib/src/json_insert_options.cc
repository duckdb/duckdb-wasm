#include "duckdb/web/json_insert_options.h"

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
namespace json {

namespace {

enum FieldTag {
    COLUMNS,
    CREATE,
    DETECT,
    SHAPE,
    NAME,
    SCHEMA,
};

static std::unordered_map<std::string_view, FieldTag> FIELD_TAGS{
    {"create", FieldTag::CREATE}, {"createNew", FieldTag::CREATE},  {"schema", FieldTag::SCHEMA},
    {"name", FieldTag::NAME},     {"shape", FieldTag::SHAPE},       {"columns", FieldTag::COLUMNS},
    {"detect", FieldTag::DETECT}, {"autoDetect", FieldTag::DETECT},
};

static std::unordered_map<std::string_view, JSONTableShape> SHAPES{
    {"row-array", JSONTableShape::ROW_ARRAY},
    {"column-object", JSONTableShape::COLUMN_OBJECT},
};

}  // namespace

/// Read from document
arrow::Status JSONInsertOptions::ReadFrom(const rapidjson::Document& doc) {
    if (!doc.IsObject()) return arrow::Status::OK();
    for (auto iter = doc.MemberBegin(); iter != doc.MemberEnd(); ++iter) {
        std::string_view name{iter->name.GetString(), iter->name.GetStringLength()};

        auto tag_iter = FIELD_TAGS.find(name);
        if (tag_iter == FIELD_TAGS.end()) continue;

        switch (tag_iter->second) {
            case FieldTag::CREATE: {
                ARROW_RETURN_NOT_OK(RequireBoolField(iter->value, name));
                create_new = iter->value.GetBool();
                break;
            }

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

            case FieldTag::SHAPE: {
                ARROW_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                auto format_iter =
                    SHAPES.find(std::string_view{iter->value.GetString(), iter->value.GetStringLength()});
                if (format_iter == SHAPES.end()) {
                    return arrow::Status::Invalid("unknown table format: ", iter->value.GetString());
                }
                table_shape = format_iter->second;
                continue;
            }

            case FieldTag::COLUMNS: {
                ARROW_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kArrayType, name));
                const auto columns_array = iter->value.GetArray();
                ARROW_ASSIGN_OR_RAISE(columns, SQLToArrowFields(columns_array));
                continue;
            }
        }
    }
    return arrow::Status::OK();
}

}  // namespace json
}  // namespace web
}  // namespace duckdb
