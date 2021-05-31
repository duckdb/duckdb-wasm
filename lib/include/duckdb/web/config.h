#ifndef INCLUDE_DUCKDB_WEB_CONFIG_H_
#define INCLUDE_DUCKDB_WEB_CONFIG_H_

#include <cstdint>

namespace duckdb {
namespace web {

enum WebDBFeature : uint32_t {
    FAST_EXCEPTIONS = 0,
    THREADS = 1,
};

constexpr uint32_t WEBDB_FEATURES = (0
#ifdef WEBDB_FAST_EXCEPTIONS
                                     | (1 << WebDBFeature::FAST_EXCEPTIONS)
#endif
#ifdef WEBDB_THREADS
                                     | (1 << WebDBFeature::THREADS)
#endif
);

}  // namespace web
}  // namespace duckdb

#endif
