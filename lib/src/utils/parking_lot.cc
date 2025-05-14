#include "duckdb/web/utils/parking_lot.h"

#include <condition_variable>
#include <thread>

namespace duckdb {
namespace web {

namespace {

struct BucketList {
    struct Bucket {
        /// The address
        const void* address = nullptr;
        /// The waiting threads
        unsigned waiting_threads = 0;
        /// The next bucket
        std::unique_ptr<Bucket> next_bucket;
        /// The condition variable
        std::condition_variable cv;
    };

    /// The mutex to protect the following member variables
    std::mutex mutex;
    /// The active buckets
    std::unique_ptr<Bucket> buckets;
    /// The inactive buckets (if any)
    std::unique_ptr<Bucket> inactive;
};

/// The parking lot bits
static constexpr size_t PARKING_LOT_BITS = 9;
/// The parking lots
static BucketList PARKING_LOTS[1 << PARKING_LOT_BITS];
/// Get the parking lot
static BucketList& getParkingLot(const void* ptr) {
    auto lot_id = std::hash<uintptr_t>()(reinterpret_cast<uintptr_t>(ptr)) >> (sizeof(size_t) * 8 - PARKING_LOT_BITS);
    return PARKING_LOTS[lot_id];
}

}  // namespace

void ParkingLot::Park(const void* addr, std::function<bool()> check, std::chrono::nanoseconds timeout) {
    // Get the parking lot
    auto& lot = getParkingLot(addr);
    std::unique_lock lock(lot.mutex);
    // Check the condition again
    if (check()) return;
    // Get bucket
    auto& bucket = [&lot, addr]() -> BucketList::Bucket& {
        for (auto iter = lot.buckets.get(); iter; iter = iter->next_bucket.get()) {
            if (iter->address == addr) return *iter;
        }
        std::unique_ptr<BucketList::Bucket> n;
        if (lot.inactive) {
            n = std::move(lot.inactive);
            lot.inactive = std::move(n->next_bucket);
        } else {
            n = std::make_unique<BucketList::Bucket>();
        }
        n->address = addr;
        n->next_bucket = std::move(lot.buckets);
        lot.buckets = std::move(n);
        return *lot.buckets;
    }();

    // Go to sleep
    ++bucket.waiting_threads;
    if (!timeout.count()) {
        while (!check()) {
            bucket.cv.wait(lock);
        }
    } else {
        auto stop = std::chrono::high_resolution_clock::now() + timeout;
        while (!check()) {
            if (bucket.cv.wait_until(lock, stop) == std::cv_status::timeout) break;
        }
    }

    // Release the bucket if we are the last user
    if (!--bucket.waiting_threads) {
        // Find the owning pointer of the bucket
        auto* next_ref = &lot.buckets;
        while (next_ref->get() != &bucket) {
            next_ref = &((*next_ref)->next_bucket);
        }
        // Mark as inactive
        auto self = std::move(*next_ref);
        (*next_ref) = std::move(bucket.next_bucket);
        bucket.next_bucket = std::move(lot.inactive);
        lot.inactive = std::move(self);
    }
}

void ParkingLot::ParkWithSpinning(const void* addr, std::function<bool()> check) {
    for (unsigned i = 0; i < 8; ++i) {
        if (check()) return;
        std::this_thread::yield();
    }
    Park(addr, check);
}

void ParkingLot::UnparkThreads(const void* addr, bool all) {
    auto& lot = getParkingLot(addr);
    std::unique_lock lot_guard(lot.mutex);
    std::condition_variable* cv = nullptr;
    for (auto iter = lot.buckets.get(); iter; iter = iter->next_bucket.get()) {
        if (iter->address == addr) {
            lot_guard.unlock();
            if (all) {
                iter->cv.notify_all();
            } else {
                iter->cv.notify_one();
            }
            return;
        }
    }
}

}  // namespace web
}  // namespace duckdb
