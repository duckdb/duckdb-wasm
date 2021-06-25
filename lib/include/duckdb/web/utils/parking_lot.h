#ifndef INCLUDE_DUCKDB_WEB_UTILS_PARKING_LOT_H_
#define INCLUDE_DUCKDB_WEB_UTILS_PARKING_LOT_H_

#include <atomic>
#include <chrono>
#include <functional>

namespace duckdb {
namespace web {

/// A parking lot.
/// https://github.com/WebKit/webkit/blob/main/Source/WTF/wtf/ParkingLot.h
class ParkingLot {
   public:
    /// Park a thread
    static void Park(const void* addr, std::function<bool()> check,
                     std::chrono::nanoseconds timeout = std::chrono::nanoseconds{0});
    /// Park a thread with spinning
    static void ParkWithSpinning(const void* addr, std::function<bool()> check);
    /// Unpark threads
    static void UnparkThreads(const void* addr, bool unpark_all);
    /// Unpark one thread
    static void UnparkOne(const void* addr) { return UnparkThreads(addr, false); }
    /// Unpark all threads
    static void UnparkAll(const void* addr) { return UnparkThreads(addr, true); }
};

}  // namespace web
}  // namespace duckdb

#endif
