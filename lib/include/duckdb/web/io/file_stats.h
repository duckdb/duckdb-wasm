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
/// Does not need to be thread-safe since we acquire a directory latch anyway to locate the page.
class FileStatisticsCollector {
    static constexpr size_t PAGE_SIZE_SHIFT = 14;

   protected:
    /// The file statistics
    struct PageStatistics {
        std::atomic<uint16_t> reads = 0;
        std::atomic<uint16_t> writes = 0;
        std::atomic<uint16_t> prefetches = 0;
    };
    /// The file statistics
    std::unique_ptr<PageStatistics[]> page_stats_ = {};
    /// The page count
    size_t page_count_ = 0;
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
    inline void Resize(uint64_t n) {
        page_stats_ = std::unique_ptr<PageStatistics[]>(new PageStatistics[n]);
        page_count_ = n;
    }
    /// Register a page read
    inline void RegisterPageRead(uint64_t offset, uint64_t length) {
        auto page_id = offset >> PAGE_SIZE_SHIFT;
        if (page_id < page_count_) {
            assert(false);
            return;
        }
        inc(page_stats_[page_id].reads);
        bytes_read += length;
    }
    /// Register a page Prefetch
    inline void RegisterPagePrefetch(uint64_t offset, uint64_t length) {
        auto page_id = offset >> PAGE_SIZE_SHIFT;
        if (page_id < page_count_) {
            assert(false);
            return;
        }
        inc(page_stats_[page_id].prefetches);
        bytes_read += length;
    }
    /// Register a page write
    inline void RegisterPageWrite(uint64_t offset, uint64_t length) {
        auto page_id = offset >> PAGE_SIZE_SHIFT;
        if (page_id < page_count_) {
            assert(false);
            return;
        }
        inc(page_stats_[page_id].writes);
        bytes_written += length;
    }

    /// Encode the page statistics
    /// lsb 		             msb
    /// 0000  0000   0000     0000
    /// reads writes prefetch unused
    ///
    /// Encoding: at least ((1 << nibble) - 1) times
    arrow::Result<std::shared_ptr<arrow::Buffer>> ExportPageStatistics() const;
};

}  // namespace io
}  // namespace web
}  // namespace duckdb

#endif
