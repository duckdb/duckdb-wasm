#include "duckdb/web/csv_insert_options.h"
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
namespace csv {

namespace {

enum FieldTag {
    COLUMNS,
    DELIMITER,
    DETECT,
    ESCAPE,
    HEADER,
    NAME,
    QUOTE,
    CREATE,
    SCHEMA,
    SKIP,
    DATEFORMAT,
    TIMESTAMPFORMAT,
};

static std::unordered_map<std::string_view, FieldTag> FIELD_TAGS{
    {"autoDetect", FieldTag::DETECT},
    {"columns", FieldTag::COLUMNS},
    {"create", FieldTag::CREATE},
    {"createNew", FieldTag::CREATE},
    {"dateFormat", FieldTag::DATEFORMAT},
    {"delim", FieldTag::DELIMITER},
    {"delimiter", FieldTag::DELIMITER},
    {"detect", FieldTag::DETECT},
    {"escape", FieldTag::ESCAPE},
    {"fields", FieldTag::COLUMNS},
    {"header", FieldTag::HEADER},
    {"name", FieldTag::NAME},
    {"quote", FieldTag::QUOTE},
    {"schema", FieldTag::SCHEMA},
    {"skip", FieldTag::SKIP},
    {"timestampFormat", FieldTag::TIMESTAMPFORMAT},
};

}  // namespace

/// Read from document
web::Status CSVInsertOptions::ReadFrom(const rapidjson::Document& doc) {
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

            case FieldTag::COLUMNS: {
                WEB_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kArrayType, name));
                const auto columns_array = iter->value.GetArray();
                WEB_ASSIGN_OR_RAISE(columns, json::SQLToDuckDBFields(columns_array));
                break;
            }

            case FieldTag::DELIMITER:
                WEB_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                delimiter = std::string{iter->value.GetString(), iter->value.GetStringLength()};
                break;

            case FieldTag::ESCAPE:
                WEB_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                escape = std::string{iter->value.GetString(), iter->value.GetStringLength()};
                break;

            case FieldTag::HEADER:
                WEB_RETURN_NOT_OK(RequireBoolField(iter->value, name));
                header = iter->value.GetBool();
                break;

            case FieldTag::NAME:
                WEB_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                table_name = {iter->value.GetString(), iter->value.GetStringLength()};
                break;

            case FieldTag::QUOTE:
                WEB_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                quote = std::string{iter->value.GetString(), iter->value.GetStringLength()};
                break;

            case FieldTag::SCHEMA:
                WEB_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                schema_name = {iter->value.GetString(), iter->value.GetStringLength()};
                break;

            case FieldTag::DETECT:
                WEB_RETURN_NOT_OK(RequireBoolField(iter->value, name));
                auto_detect = iter->value.GetBool();
                break;

            case FieldTag::SKIP:
                WEB_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kNumberType, name));
                skip = iter->value.GetInt64();
                break;

            case FieldTag::DATEFORMAT:
                WEB_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                dateformat = std::string{iter->value.GetString(), iter->value.GetStringLength()};
                break;

            case FieldTag::TIMESTAMPFORMAT:
                WEB_RETURN_NOT_OK(RequireFieldType(iter->value, rapidjson::Type::kStringType, name));
                timestampformat = std::string{iter->value.GetString(), iter->value.GetStringLength()};
                break;
        }
    }
    return web::Status::OK();
}

}  // namespace csv
}  // namespace web
}  // namespace duckdb
