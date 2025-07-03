#ifndef INCLUDE_DUCKDB_WEB_CONFIG_H_
#define INCLUDE_DUCKDB_WEB_CONFIG_H_

#include <rapidjson/document.h>

#include <cstdint>
#include <optional>
#include <string>
#include <string_view>

namespace duckdb {
namespace web {

enum WebDBFeature : uint32_t {
    FAST_EXCEPTIONS = 0,
    THREADS = 1,
    SIMD = 2,
    BULK_MEMORY = 3,
    BIGINT64ARRAY = 4,
};

constexpr uint32_t STATIC_WEBDB_FEATURES = (0
#ifdef WEBDB_FAST_EXCEPTIONS
                                            | (1 << WebDBFeature::FAST_EXCEPTIONS)
#endif
#ifdef WEBDB_THREADS
                                            | (1 << WebDBFeature::THREADS)
#endif
#ifdef WEBDB_SIMD
                                            | (1 << WebDBFeature::SIMD)
#endif
#ifdef WEBDB_BULK_MEMORY
                                            | (1 << WebDBFeature::BULK_MEMORY)
#endif
);

/// Resolve feature flags
uint32_t ResolveFeatureFlags();

struct QueryConfig {
    /// Polling interval for pending queries (in ms)
    std::optional<int64_t> query_polling_interval = std::nullopt;
    /// Cast BigInts to Doubles
    std::optional<bool> cast_bigint_to_double = std::nullopt;
    /// Cast Timestamp[ms] to Date64
    std::optional<bool> cast_timestamp_to_date = std::nullopt;
    /// Cast Duration to Time64
    std::optional<bool> cast_duration_to_time64 = std::nullopt;
    /// Cast Decimal to Double
    std::optional<bool> cast_decimal_to_double = std::nullopt;

    /// Has any cast?
    bool hasAnyCast() const {
        return cast_bigint_to_double.value_or(false) || cast_timestamp_to_date.value_or(false) ||
               cast_duration_to_time64.value_or(false) || cast_decimal_to_double.value_or(false);
    }
    /// Read from a document
    static QueryConfig ReadFrom(std::string_view args_json);
};

/// ConfigurationOptions fetched from DuckDB
struct DuckDBConfigOptions {
    std::string s3_region;
    std::string s3_endpoint;
    std::string s3_access_key_id;
    std::string s3_secret_access_key;
    std::string s3_session_token;
    bool reliable_head_requests;
};

struct FileSystemConfig {
    /// Allow falling back to full HTTP reads if the server does not support range requests
    std::optional<bool> allow_full_http_reads = std::nullopt;
    /// Force full HTTP reads, suppressing use of range requests
    std::optional<bool> force_full_http_reads = std::nullopt;
    std::optional<bool> reliable_head_requests = std::nullopt;
};

struct WebDBConfig {
    /// The database path
    std::string path = "";
    /// The access mode
    std::optional<int8_t> access_mode = std::nullopt;
    /// The thread count
    uint32_t maximum_threads = (STATIC_WEBDB_FEATURES & (1 << WebDBFeature::THREADS)) ? 4 : 1;
    /// The direct io flag
    bool use_direct_io = false;
    /// The query config
    QueryConfig query = {
        .cast_bigint_to_double = std::nullopt,
        .cast_timestamp_to_date = std::nullopt,
        .cast_duration_to_time64 = std::nullopt,
        .cast_decimal_to_double = std::nullopt,
    };
    /// The filesystem
    FileSystemConfig filesystem = {
        .allow_full_http_reads = std::nullopt,
        .force_full_http_reads = std::nullopt,
        .reliable_head_requests = std::nullopt,
    };

    /// These options are fetched from DuckDB
    DuckDBConfigOptions duckdb_config_options = {
        .s3_region = "",
        .s3_endpoint = "",
        .s3_access_key_id = "",
        .s3_secret_access_key = "",
        .s3_session_token = "",
        .reliable_head_requests = true,
    };

    /// Whether to allow unsigned extensions
    bool allow_unsigned_extensions = false;

    /// Whether to use alternate Arrow conversion that preserves full range and precision of data.
    bool arrow_lossless_conversion = false;

    std::string custom_user_agent = "";

    /// Read from a document
    static WebDBConfig ReadFrom(std::string_view args_json);
};

}  // namespace web
}  // namespace duckdb

#endif
