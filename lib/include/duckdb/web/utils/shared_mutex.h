#ifndef INCLUDE_DUCKDB_WEB_UTILS_SHARED_MUTEX_H_
#define INCLUDE_DUCKDB_WEB_UTILS_SHARED_MUTEX_H_

#include <atomic>

namespace duckdb {
namespace web {

class SharedMutex {
   protected:
    /// The lock data
    std::atomic<uint64_t> data;
    /// Tries to mark the lock as waiting either as reader or writer
    bool tryMarkAsWaiting(bool writer);

   public:
    /// Constructor
    SharedMutex() : data{0} {}
    /// Deleted copy constructor
    SharedMutex(const SharedMutex&) = delete;

    /// Try to lock shared
    bool try_lock_shared();
    /// Try to lock exclusively
    bool try_lock();
    /// Lock
    void lock();
    /// Lock shared
    void lock_shared();
    /// Unlock
    void unlock();
    /// Unlock shared
    void unlock_shared();
};

}  // namespace web
}  // namespace duckdb

#endif
