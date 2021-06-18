#ifndef INCLUDE_DUCKDB_WEB_IO_FILE_STATS_H_
#define INCLUDE_DUCKDB_WEB_IO_FILE_STATS_H_

#include <atomic>
#include <cassert>
#include <cstdint>
#include <limits>
#include <streambuf>
#include <vector>

#include "arrow/buffer.h"
#include "arrow/status.h"

namespace duckdb {
namespace web {
namespace io {

/// A collector for file statistics.
/// Does not need to be thread-safe since we acquire a directory latch anyway to locate the block.
class FileStatisticsCollector {
    static constexpr size_t MAX_RANGE_COUNT = 10000;
    static constexpr size_t MIN_RANGE_SHIFT = 13;  // 8KB

   protected:
    /// The file statistics
    struct BlockStatistics {
        std::atomic<uint16_t> reads = 0;
        std::atomic<uint16_t> writes = 0;
        std::atomic<uint16_t> prefetches = 0;
    };
    /// The block size shift
    size_t block_shift_ = 0;
    /// The block count
    size_t block_count_ = 0;
    /// The file statistics
    std::unique_ptr<BlockStatistics[]> block_stats_ = {};
    /// The number of read bytes
    std::atomic<uint64_t> bytes_read = 0;
    /// The number of written bytes
    std::atomic<uint64_t> bytes_written = 0;

    /// Increment hits
    static inline void inc(std::atomic<uint16_t>& hits) {
        uint16_t expected = hits.load(std::memory_order_relaxed);
        uint16_t next;
        do {
            next = std::min<uint16_t>(std::numeric_limits<uint16_t>::max() - 1, expected) + 1;
        } while (hits.compare_exchange_weak(expected, next));
    }

   public:
    /// Constructor
    FileStatisticsCollector() = default;

    /// Resize the file
    void Resize(uint64_t n);
    /// Register a read
    inline void RegisterRead(uint64_t offset, uint64_t length) {
        auto block_id = offset >> block_shift_;
        if (block_id >= block_count_) {
            assert(false);
            return;
        }
        inc(block_stats_[block_id].reads);
        bytes_read += length;
    }
    /// Register a prefetch
    inline void RegisterPrefetch(uint64_t offset, uint64_t length) {
        auto block_id = offset >> block_shift_;
        if (block_id >= block_count_) {
            assert(false);
            return;
        }
        inc(block_stats_[block_id].prefetches);
        bytes_read += length;
    }
    /// Register a write
    inline void RegisterWrite(uint64_t offset, uint64_t length) {
        auto block_id = offset >> block_shift_;
        if (block_id >= block_count_) {
            assert(false);
            return;
        }
        inc(block_stats_[block_id].writes);
        bytes_written += length;
    }

    /// Encode the block accesses
    /// lsb 		             msb
    /// 0000  0000   0000     0000
    /// reads writes prefetch unused
    ///
    /// Encoding: at least ((1 << nibble) - 1) times
    arrow::Result<std::shared_ptr<arrow::Buffer>> ExportBlockStatistics() const;
};

}  // namespace io
}  // namespace web
}  // namespace duckdb

#endif
