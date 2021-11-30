#include "duckdb/web/config.h"

#include <optional>

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

/// Get feature flags
uint32_t ResolveFeatureFlags() {
    auto flags = STATIC_WEBDB_FEATURES;
    if (duckdb_web_test_platform_feature(PlatformFeature::BIGINT64ARRAY)) {
        flags |= 1 << WebDBFeature::BIGINT64ARRAY;
    }
    return flags;
}

/// Read the webdb config
WebDBConfig WebDBConfig::ReadFrom(std::string_view args_json) {
    auto config = WebDBConfig{
        .path = ":memory:",
        .maximum_threads = 1,
        .query =
            QueryConfig{
                .cast_bigint_to_double = std::nullopt,
                .cast_timestamp_to_date64 = std::nullopt,
            },
        .filesystem = FileSystemConfig{.allow_full_http_reads = std::nullopt},
    };
    rapidjson::Document doc;
    rapidjson::ParseResult ok = doc.Parse(args_json.begin(), args_json.size());
    if (ok) {
        if (doc.HasMember("path") && doc["path"].IsString()) {
            config.path = doc["path"].GetString();
        }
        if (doc.HasMember("maximumThreads") && doc["maximumThreads"].IsNumber()) {
            config.maximum_threads = doc["maximumThreads"].GetInt();
        }
        if (doc.HasMember("query") && doc["query"].IsObject()) {
            auto q = doc["query"].GetObject();
            if (q.HasMember("castBigIntToDouble") && q["castBigIntToDouble"].IsBool()) {
                config.query.cast_bigint_to_double = q["castBigIntToDouble"].GetBool();
            }
            if (q.HasMember("castTimestampToDate64") && q["castTimestampToDate64"].IsBool()) {
                config.query.cast_timestamp_to_date64 = q["castTimestampToDate64"].GetBool();
            }
        }
        if (doc.HasMember("filesystem") && doc["filesystem"].IsObject()) {
            auto fs = doc["filesystem"].GetObject();
            if (fs.HasMember("allowFullHTTPReads") && fs["allowFullHTTPReads"].IsBool()) {
                config.filesystem.allow_full_http_reads = fs["allowFullHTTPReads"].GetBool();
            }
        }
    }
    if (!config.query.cast_bigint_to_double.has_value()) {
        config.query.cast_bigint_to_double = !duckdb_web_test_platform_feature(PlatformFeature::BIGINT64ARRAY);
    }
    return config;
}

}  // namespace web
}  // namespace duckdb
