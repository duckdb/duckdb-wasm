#ifndef INCLUDE_DUCKDB_WEB_MUTEX_H_
#define INCLUDE_DUCKDB_WEB_MUTEX_H_

#include <cstdint>
#include <mutex>
#include <shared_mutex>

namespace duckdb {
namespace web {

#ifdef DUCKDB_NO_THREADS
struct PseudoMutex {
    void lock() {}
    void lock_shared() {}
    void unlock() {}
    void unlock_shared() {}
    bool try_lock() { return true; }
    bool try_lock_shared() { return true; }
};
using Mutex = PseudoMutex;
using SharedMutex = PseudoMutex;
#else
using Mutex = std::mutex;
using SharedMutex = std::shared_mutex;
#endif

}  // namespace web
}  // namespace duckdb

#endif
