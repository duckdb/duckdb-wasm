#ifndef INCLUDE_DUCKDB_WEB_CONFIG_H_
#define INCLUDE_DUCKDB_WEB_CONFIG_H_

#include <rapidjson/document.h>

#include <cstdint>
#include <string>
#include <string_view>

namespace duckdb {
namespace web {

enum WebDBFeature : uint32_t {
    FAST_EXCEPTIONS = 0,
    THREADS = 1,
    SIMD = 2,
    BULK_MEMORY = 3,
    EMIT_BIGINT = 4,
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

struct FileSystemConfig {
    /// Allow falling back to full HTTP reads if the server does not support range requests
    bool allow_full_http_reads = false;
};

struct WebDBConfig {
    /// The database path
    std::string path = "";
    /// Emit BigInt values?
    /// This depends on the browser supporting BigInt64Array.
    bool emit_bigint = false;
    /// The thread count
    uint32_t maximum_threads = 1;
    /// The filesystem
    FileSystemConfig filesystem = {
        .allow_full_http_reads = false,
    };

    /// Read from a document
    static WebDBConfig ReadFrom(std::string_view args_json);
};

}  // namespace web
}  // namespace duckdb

#endif
