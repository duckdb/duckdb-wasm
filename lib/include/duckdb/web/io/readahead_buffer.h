#ifndef INCLUDE_DUCKDB_WEB_IO_READAHEAD_BUFFER_H_
#define INCLUDE_DUCKDB_WEB_IO_READAHEAD_BUFFER_H_

#include <atomic>
#include <iostream>
#include <limits>
#include <list>
#include <memory>
#include <unordered_set>

#include "arrow/status.h"
#include "duckdb/common/constants.hpp"
#include "duckdb/common/file_system.hpp"
#include "duckdb/web/io/file_stats.h"

namespace duckdb {
namespace web {
namespace io {

constexpr size_t READAHEAD_ACCELERATION = 8;   // x *= 8
constexpr size_t READAHEAD_BASE = 1 << 14;     // 16 KB
constexpr size_t READAHEAD_MAXIMUM = 1 << 24;  // 16 MB
constexpr size_t READ_HEAD_COUNT = 10;         // (READ_HEAD_COUNT * READAHEAD_MAXIMUM) bytes

/// A readahead buffer that is meant to be maintained per thread
class ReadAheadBuffer {
   protected:
    /// A read head
    struct ReadHead {
        /// The file id
        uint64_t file_id = std::numeric_limits<uint64_t>::max();
        /// The offset (of the buffered data)
        uint64_t offset = 0;
        /// The speed in bytes
        size_t speed = READAHEAD_BASE;
        /// The buffer size
        size_t buffer_size = 0;
        /// The buffer capacity
        size_t buffer_capacity = 0;
        /// The buffered data
        std::unique_ptr<char[]> buffer = nullptr;
    };

    /// The invalidation mask (never read from files where (~invalidation & file_id == 0)).
    /// Reading/writing is synchronized with the file mutex but we have to make sure that we also
    /// invalidate the read heads that are shared accross files.
    ///
    /// We find all read heads with the filesystem mutex and then FETCH_OR file ids with the invalidation mask.
    /// Readers always check the invalidation mask and invalidate read heads before reading.
    std::atomic<uint64_t> invalidation_mask_ = 0;
    /// The read heads
    std::list<ReadHead> read_heads_ = {};

   public:
    /// Constructor
    ReadAheadBuffer() { read_heads_.resize(READ_HEAD_COUNT); }

    /// Invalidate a file id
    void Invalidate(uint64_t file_id) { invalidation_mask_.fetch_or(file_id); }
    /// Invalidate read heads
    void ApplyInvalidations() {
        auto invalidations = invalidation_mask_.exchange(0);
        if (invalidations == 0) return;
        for (auto iter = read_heads_.begin(); iter != read_heads_.end();) {
            auto current = iter++;
            if (((~invalidations) & current->file_id) == 0) {
                current->file_id = std::numeric_limits<uint64_t>::max();
                read_heads_.splice(read_heads_.begin(), read_heads_, current);
            }
        }
    }
    /// Erase a file
    void Drop(uint64_t file_id) {
        for (auto iter = read_heads_.begin(); iter != read_heads_.end(); ++iter) {
            if (iter->file_id == file_id) {
                iter->file_id = std::numeric_limits<uint64_t>::max();
            }
        }
    }
    /// Read up to nr_bytes bytes into the buffer
    template <typename Fn>
    int64_t Read(uint32_t file_id, uint64_t file_size, void* buffer, int64_t nr_bytes, duckdb::idx_t offset, Fn read_fn,
                 FileStatisticsCollector* stats = nullptr) {
        // First apply all invalidations
        ApplyInvalidations();
        // Helper to allocate buffer in the read head
        auto allocate = [](ReadHead& head, size_t size) {
            if (size <= head.buffer_capacity) {
                head.buffer_size = size;
                return;
            }
            head.buffer = nullptr;
            head.buffer = std::unique_ptr<char[]>(new char[size]);
            head.buffer_size = size;
            head.buffer_capacity = size;
        };

        for (auto iter = read_heads_.begin(); iter != read_heads_.end(); ++iter) {
            // Not the requested file?
            if (iter->file_id != file_id) continue;

            // Readahead not compatible?
            auto begin = iter->offset;
            auto end = iter->offset + iter->buffer_size;
            if (offset < begin) continue;

            // Can we serve the data with our readahead?
            // We don't accelerate here.
            if (offset < end) {
                // Read from buffer
                auto skip_here = offset - iter->offset;
                auto copy_here = std::min<size_t>(iter->buffer_size - skip_here, nr_bytes);
                assert(iter->buffer_size > skip_here);
                std::memcpy(buffer, iter->buffer.get() + skip_here, copy_here);

                // Register cached
                if (stats) {
                    stats->RegisterFileReadCached(offset, copy_here);
                }

                // Move to the end of LRU queue
                read_heads_.splice(read_heads_.end(), read_heads_, iter);
                return copy_here;
            }

            // Accelerate readahead if read occurs exactly at end
            if (offset == end) {
                // Update read head
                iter->speed = std::max<size_t>(
                    std::min<size_t>(iter->speed * READAHEAD_ACCELERATION, READAHEAD_MAXIMUM), READAHEAD_BASE);
                allocate(*iter, iter->speed);

                // Perform read
                auto safe_offset = std::min<uint64_t>(file_size, end);
                auto read_here = std::min<uint64_t>(file_size - safe_offset, iter->speed);
                iter->buffer_size = read_fn(iter->buffer.get(), read_here, safe_offset);
                iter->offset = end;

                // Copy requested bytes
                auto copy_here = std::min<int64_t>(iter->buffer_size, nr_bytes);
                std::memcpy(buffer, iter->buffer.get(), copy_here);

                // Register file read
                if (stats) {
                    auto ahead = iter->buffer_size - copy_here;
                    stats->RegisterFileReadCold(safe_offset, copy_here);
                    stats->RegisterFileReadAhead(safe_offset + copy_here, ahead);
                }

                // Move to the end of LRU queue
                read_heads_.splice(read_heads_.end(), read_heads_, iter);
                return copy_here;
            }
        }

        // No read head qualified.
        // Reset the first read head.
        auto iter = read_heads_.begin();
        iter->file_id = file_id;
        iter->speed = nr_bytes;
        iter->buffer_size = 0;

        // Important:
        // We do not buffer the very first read since don't want to copy the data when the accesses are entirely random!
        // We instead just set the offset to the END of the read and use a buffer size of 0.
        auto safe_offset = std::min<uint64_t>(file_size, offset);
        auto read_here = std::min<uint64_t>(file_size - safe_offset, iter->speed);
        auto bytes_read = read_fn(buffer, read_here, safe_offset);
        iter->offset = safe_offset + bytes_read;

        // Register cold read
        if (stats) {
            stats->RegisterFileReadCold(safe_offset, bytes_read);
        }

        // Move to the end of LRU queue
        read_heads_.splice(read_heads_.end(), read_heads_, iter);
        return bytes_read;
    }
};

}  // namespace io
}  // namespace web
}  // namespace duckdb

#endif
