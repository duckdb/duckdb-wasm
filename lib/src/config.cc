#include "duckdb/web/arrow_casts.h"
#include "duckdb/web/webdb.h"

namespace duckdb {
namespace web {

WebDBConfig WebDBConfig::ReadFrom(std::string_view args_json) {
    rapidjson::Document doc;
    rapidjson::ParseResult ok = doc.Parse(args_json.begin(), args_json.size());
    if (!ok) {
        return {
            .path = ":memory:",
            .emit_bigint = true,
        };
    }
    return {
        .path = (!doc.HasMember("path") || !doc["path"].IsString()) ? ":memory:" : doc["path"].GetString(),
        .emit_bigint =
            (!doc.HasMember("emitBigInt") || !doc["emitBigInt"].IsBool()) ? true : doc["emitBigInt"].GetBool(),
    };
}

}  // namespace web
}  // namespace duckdb
