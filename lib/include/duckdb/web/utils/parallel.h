#ifndef INCLUDE_DUCKDB_WEB_UTILS_MUTEX_H_
#define INCLUDE_DUCKDB_WEB_UTILS_MUTEX_H_

#ifdef DUCKDB_NO_THREADS

namespace duckdb {
namespace web {

// A pseudo mutex that does nothing.
// We use this for single-threaded versions of duckdb-wasm.
struct PseudoMutex {
    void lock() {}
    void lock_shared() {}
    void unlock() {}
    void unlock_shared() {}
    bool try_lock() { return true; }
    bool try_lock_shared() { return true; }
};
using SharedMutex = PseudoMutex;
using LightMutex = PseudoMutex;

}  // namespace web
}  // namespace duckdb

#else

// #include "duckdb/web/utils/shared_mutex.h"
#include <shared_mutex>

#include "duckdb/web/utils/spin_mutex.h"

namespace duckdb {
namespace web {

using SharedMutex = std::shared_mutex;
using LightMutex = SpinMutex;

}  // namespace web
}  // namespace duckdb

#endif

#endif
