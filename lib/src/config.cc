#include "duckdb/web/arrow_casts.h"
#include "duckdb/web/webdb.h"

namespace duckdb {
namespace web {

namespace {

/// A platform feature
enum PlatformFeature : uint32_t {
    BIGINT64ARRAY = 1,
};

/// The runtime function to check runtime features
#ifdef EMSCRIPTEN
extern "C" bool duckdb_web_test_platform_feature(uint32_t feature);
#else
bool duckdb_web_test_platform_feature(uint32_t _feature) { return false; }
#endif

}  // namespace

WebDBConfig WebDBConfig::ReadFrom(std::string_view args_json) {
    rapidjson::Document doc;
    rapidjson::ParseResult ok = doc.Parse(args_json.begin(), args_json.size());
    if (!ok) {
        auto bigint = duckdb_web_test_platform_feature(PlatformFeature::BIGINT64ARRAY);
        return {
            .path = ":memory:",
            .emit_bigint = bigint,
        };
    }
    auto path = (!doc.HasMember("path") || !doc["path"].IsString()) ? ":memory:" : doc["path"].GetString();
    bool bigint;
    if (doc.HasMember("emitBigInt") && doc["emitBigInt"].IsBool()) {
        bigint = doc["emitBigInt"].GetBool();
    } else {
        bigint = duckdb_web_test_platform_feature(PlatformFeature::BIGINT64ARRAY);
    }
    return {.path = path, .emit_bigint = bigint};
}

}  // namespace web
}  // namespace duckdb
