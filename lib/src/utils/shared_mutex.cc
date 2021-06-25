#include "duckdb/web/utils/shared_mutex.h"

#include <cassert>

#include "duckdb/web/utils/parking_lot.h"

using namespace std;

namespace duckdb {
namespace web {

static constexpr uint64_t EXCLUSIVE = 1ull << 63;
static constexpr uint64_t WAITING_WRITER = 1ull << 62;
static constexpr uint64_t WAITING_READER = 1ull << 61;
static constexpr uint64_t ANYONE_WAITING = WAITING_WRITER | WAITING_READER;
static constexpr uint64_t READER_COUNT = ~(EXCLUSIVE | ANYONE_WAITING);

static inline bool hasBits(uint64_t value, uint64_t bits) { return (value & bits) != 0; }

bool SharedMutex::tryMarkAsWaiting(bool writer) {
    // Is already marked as waiting?
    auto value = data.load();
    if (hasBits(value, ANYONE_WAITING)) return true;
    // Try to mark as waiting
    return (data.compare_exchange_weak(value, value | (writer ? WAITING_WRITER : WAITING_READER)));
}

bool SharedMutex::try_lock_shared() {
    // Currently locked exclusively?
    uint64_t value = data.load();
    if (hasBits(value, EXCLUSIVE) || hasBits(value, WAITING_WRITER)) {
        return false;
    }
    // Increase reader counter
    auto result = data.fetch_add(1);
    if (hasBits(value, EXCLUSIVE)) {
        --data;
        return false;
    }
    return true;
}

bool SharedMutex::try_lock() {
    uint64_t value = data.load();
    do {
        // Is already locked exclusively or has any readers?
        if (hasBits(value, EXCLUSIVE) || ((value & READER_COUNT) > 0)) {
            return false;
        }
    } while (!data.compare_exchange_weak(value, value | EXCLUSIVE));
    return true;
}

void SharedMutex::lock() {
    while (!try_lock()) {
        // Mark as waiting
        if (!tryMarkAsWaiting(true)) continue;
        // Wait until no longer exclusively locked
        ParkingLot::ParkWithSpinning(&data, [this]() {
            auto value = data.load();
            return !hasBits(value, EXCLUSIVE) || !hasBits(value, ANYONE_WAITING);
        });
    }
}

void SharedMutex::unlock() {
    auto value = data.fetch_and(READER_COUNT);
    assert(value & EXCLUSIVE && "was not locked exclusively");
    if (hasBits(value, ANYONE_WAITING)) {
        ParkingLot::UnparkAll(&data);
    }
}

void SharedMutex::lock_shared() {
    while (!try_lock_shared()) {
        // Mark as waiting
        if (!tryMarkAsWaiting(false)) continue;
        // Wait until no longer exclusively locked
        ParkingLot::ParkWithSpinning(&data, [this]() {
            auto value = data.load();
            return !hasBits(value, EXCLUSIVE) || !hasBits(value, ANYONE_WAITING);
        });
    }
}

void SharedMutex::unlock_shared() {
    auto prev = data.fetch_sub(1);
    assert((prev & READER_COUNT) && "was not locked shared");
    if (((prev & READER_COUNT) == 1) && hasBits(prev, ANYONE_WAITING)) {
        // Are we the last waiting reader one?
        // Remove wait bit and unpark threads
        --prev;
        while (!data.compare_exchange_weak(prev, prev & ~WAITING_READER))
            ;
        ParkingLot::UnparkAll(&data);
    }
}

}  // namespace web
}  // namespace duckdb
