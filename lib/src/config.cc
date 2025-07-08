#include "duckdb/web/config.h"

#include <optional>

#include "duckdb/web/arrow_casts.h"
#include "duckdb/web/io/web_filesystem.h"
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
    auto config = WebDBConfig{.path = ":memory:",
                              .access_mode = std::nullopt,
                              .maximum_threads = (STATIC_WEBDB_FEATURES & (1 << WebDBFeature::THREADS)) ? 4 : 1,
                              .query =
                                  QueryConfig{
                                      .cast_bigint_to_double = std::nullopt,
                                      .cast_timestamp_to_date = std::nullopt,
                                      .cast_duration_to_time64 = true,
                                      .cast_decimal_to_double = std::nullopt,
                                  },
                              .filesystem =
                                  FileSystemConfig{
                                      .allow_full_http_reads = std::nullopt,
                                      .force_full_http_reads = std::nullopt,
                                      .reliable_head_requests = std::nullopt,
                                  },
                              .duckdb_config_options =
                                  DuckDBConfigOptions{
                                      .s3_region = "",
                                      .s3_endpoint = "",
                                      .s3_access_key_id = "",
                                      .s3_secret_access_key = "",
                                      .s3_session_token = "",
                                  },
                              .allow_unsigned_extensions = false,
                              .arrow_lossless_conversion = false,
                              .custom_user_agent = ""};
    rapidjson::Document doc;
    rapidjson::ParseResult ok = doc.Parse(args_json.data(), args_json.size());
    if (ok) {
        if (doc.HasMember("path") && doc["path"].IsString()) {
            config.path = doc["path"].GetString();
        }
        if (doc.HasMember("accessMode") && doc["accessMode"].IsNumber()) {
            config.access_mode = doc["accessMode"].GetInt();
        }
        if (doc.HasMember("maximumThreads") && doc["maximumThreads"].IsNumber()) {
            config.maximum_threads = doc["maximumThreads"].GetInt();
        }
        if (doc.HasMember("allowUnsignedExtensions") && doc["allowUnsignedExtensions"].IsBool()) {
            config.allow_unsigned_extensions = doc["allowUnsignedExtensions"].GetBool();
        }
        if (doc.HasMember("arrowLosslessConversion") && doc["arrowLosslessConversion"].IsBool()) {
            config.arrow_lossless_conversion = doc["arrowLosslessConversion"].GetBool();
        }
        if (doc.HasMember("useDirectIO") && doc["useDirectIO"].IsBool()) {
            config.use_direct_io = doc["useDirectIO"].GetBool();
        }
        if (doc.HasMember("query") && doc["query"].IsObject()) {
            auto q = doc["query"].GetObject();
            if (q.HasMember("queryPollingInterval") && q["queryPollingInterval"].IsNumber()) {
                config.query.query_polling_interval = q["queryPollingInterval"].GetInt64();
            }
            if (q.HasMember("castBigIntToDouble") && q["castBigIntToDouble"].IsBool()) {
                config.query.cast_bigint_to_double = q["castBigIntToDouble"].GetBool();
            }
            if (q.HasMember("castTimestampToDate") && q["castTimestampToDate"].IsBool()) {
                config.query.cast_timestamp_to_date = q["castTimestampToDate"].GetBool();
            }
            if (q.HasMember("castDurationToTime64") && q["castDurationToTime64"].IsBool()) {
                config.query.cast_duration_to_time64 = q["castDurationToTime64"].GetBool();
            }
            if (q.HasMember("castDecimalToDouble") && q["castDecimalToDouble"].IsBool()) {
                config.query.cast_decimal_to_double = q["castDecimalToDouble"].GetBool();
            }
        }
        if (doc.HasMember("filesystem") && doc["filesystem"].IsObject()) {
            auto fs = doc["filesystem"].GetObject();
            if (fs.HasMember("allowFullHTTPReads") && fs["allowFullHTTPReads"].IsBool()) {
                config.filesystem.allow_full_http_reads = fs["allowFullHTTPReads"].GetBool();
            }
            if (fs.HasMember("forceFullHTTPReads") && fs["forceFullHTTPReads"].IsBool()) {
                config.filesystem.force_full_http_reads = fs["forceFullHTTPReads"].GetBool();
            }
            if (fs.HasMember("reliableHeadRequests") && fs["reliableHeadRequests"].IsBool()) {
                config.filesystem.reliable_head_requests = fs["reliableHeadRequests"].GetBool();
            }
        }
        if (doc.HasMember("customUserAgent") && doc["customUserAgent"].IsString()) {
            config.custom_user_agent = doc["customUserAgent"].GetString();
        }
    }
    if (!config.query.cast_bigint_to_double.has_value()) {
        config.query.cast_bigint_to_double = !duckdb_web_test_platform_feature(PlatformFeature::BIGINT64ARRAY);
    }
    return config;
}

}  // namespace web
}  // namespace duckdb
