#ifndef INCLUDE_DUCKDB_WEB_UTILS_SPIN_MUTEX_H_
#define INCLUDE_DUCKDB_WEB_UTILS_SPIN_MUTEX_H_

#include <atomic>

namespace duckdb {
namespace web {

/// A simple mutex as pure spin-lock that never leaves wasm.
struct SpinMutex {
    std::atomic_flag flag{0};
    void lock() {
        while (flag.test_and_set(std::memory_order_acq_rel))
            ;
    }
    void unlock() { flag.clear(); }
    bool try_lock() { return flag.test_and_set(); }
};

}  // namespace web
}  // namespace duckdb

#endif
