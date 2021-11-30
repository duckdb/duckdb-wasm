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
    /// Cast BigInts to Doubles
    std::optional<bool> cast_bigint_to_double = std::nullopt;
    /// Cast Timestamp[ms] to Date64
    std::optional<bool> cast_timestamp_to_date64 = std::nullopt;

    /// Has any cast?
    bool hasAnyCast() const {
        return cast_bigint_to_double.value_or(false) || cast_timestamp_to_date64.value_or(false);
    }
    /// Read from a document
    static QueryConfig ReadFrom(std::string_view args_json);
};

struct FileSystemConfig {
    /// Allow falling back to full HTTP reads if the server does not support range requests
    std::optional<bool> allow_full_http_reads = std::nullopt;
};

struct WebDBConfig {
    /// The database path
    std::string path = "";
    /// The thread count
    uint32_t maximum_threads = 1;
    /// The query config
    QueryConfig query = {
        .cast_bigint_to_double = std::nullopt,
        .cast_timestamp_to_date64 = std::nullopt,
    };
    /// The filesystem
    FileSystemConfig filesystem = {
        .allow_full_http_reads = std::nullopt,
    };

    /// Read from a document
    static WebDBConfig ReadFrom(std::string_view args_json);
};

}  // namespace web
}  // namespace duckdb

#endif
