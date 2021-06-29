#ifndef INCLUDE_DUCKDB_WEB_IO_FILE_STATS_H_
#define INCLUDE_DUCKDB_WEB_IO_FILE_STATS_H_

#include <atomic>
#include <cassert>
#include <cstdint>
#include <limits>
#include <streambuf>
#include <unordered_map>
#include <vector>

#include "arrow/buffer.h"
#include "arrow/status.h"
#include "duckdb/web/io/file_page_defaults.h"
#include "duckdb/web/utils/parallel.h"

namespace duckdb {
namespace web {
namespace io {

/// A collector for file statistics.
/// Does not need to be thread-safe since we acquire a directory latch anyway to locate the block.
class FileStatisticsCollector {
    static constexpr size_t MAX_RANGE_COUNT = 10000;
    static constexpr size_t MIN_RANGE_SHIFT = DEFAULT_FILE_PAGE_SHIFT;

   protected:
    /// The file statistics
    struct BlockStatistics {
        std::atomic<uint16_t> file_read_cold = 0;
        std::atomic<uint16_t> file_read_ahead = 0;
        std::atomic<uint16_t> file_read_cached = 0;
        std::atomic<uint16_t> file_write = 0;
        std::atomic<uint16_t> page_read = 0;
        std::atomic<uint16_t> page_write = 0;
    };

    /// The collector mutex (used for resizing)
    LightMutex collector_mutex_ = {};
    /// The block size shift
    size_t block_shift_ = 0;
    /// The block count
    size_t block_count_ = 0;
    /// The file statistics
    std::unique_ptr<BlockStatistics[]> block_stats_ = {};

    /// Is active?
    std::atomic<bool> active_ = true;

    /// The number of file bytes that were read cold
    std::atomic<uint64_t> bytes_file_read_cold_ = 0;
    std::atomic<uint64_t> bytes_file_read_ahead_ = 0;
    std::atomic<uint64_t> bytes_file_read_cached_ = 0;
    std::atomic<uint64_t> bytes_file_write_ = 0;
    std::atomic<uint64_t> bytes_page_read_ = 0;
    std::atomic<uint64_t> bytes_page_write_ = 0;

    /// Increment hits
    static inline void inc(uint16_t& hits) {
        hits = std::min<uint16_t>(std::numeric_limits<uint16_t>::max() - 1, hits) + 1;
    }
    /// Register a read
    template <typename GetCounter>
    inline void BumpCounter(uint64_t offset, uint64_t length, GetCounter counter, std::atomic<uint64_t>& total) {
        if (!active_) return;
        auto block_id = offset >> block_shift_;
        if (block_id >= block_count_) {
            assert(false);
            return;
        }
        auto& hits = counter(block_stats_[block_id]);

        // We don't care too much about overflows here since these counters are not meant to be super accurate.
        auto hit = hits.fetch_add(1);
        if ((hit + 1) > (1 << 15)) hits = 1 << 15;
    }

   public:
    /// Constructor
    FileStatisticsCollector() = default;

    /// Activate the collector
    void Activate(bool value) { active_ = value; }
    /// Resize the file
    void Resize(uint64_t n);
    /// Register a read
    inline void RegisterFileReadAhead(uint64_t offset, uint64_t length) {
        BumpCounter(
            offset, length, [](auto& s) -> auto& { return s.file_read_ahead; }, bytes_file_read_ahead_);
    }
    /// Register a read cold
    inline void RegisterFileReadCold(uint64_t offset, uint64_t length) {
        BumpCounter(
            offset, length, [](auto& s) -> auto& { return s.file_read_cold; }, bytes_file_read_cold_);
    }
    /// Register a cache hit
    inline void RegisterFileReadCached(uint64_t offset, uint64_t length) {
        BumpCounter(
            offset, length, [](auto& s) -> auto& { return s.file_read_cached; }, bytes_file_read_cached_);
    }
    /// Register a write
    inline void RegisterFileWrite(uint64_t offset, uint64_t length) {
        BumpCounter(
            offset, length, [](auto& s) -> auto& { return s.file_write; }, bytes_file_write_);
    }
    /// Register a page read
    inline void RegisterPageRead(uint64_t offset, uint64_t length) {
        BumpCounter(
            offset, length, [](auto& s) -> auto& { return s.page_read; }, bytes_page_read_);
    }
    /// Register a page write
    inline void RegisterPageWrite(uint64_t offset, uint64_t length) {
        BumpCounter(
            offset, length, [](auto& s) -> auto& { return s.page_write; }, bytes_page_write_);
    }

    /// The block stats
    using ExportedBlockStats = uint8_t[3];
    /// The export file statistics
    struct ExportFileStatistics {
        double bytes_file_cold = 0;
        double bytes_file_ahead = 0;
        double bytes_file_cached = 0;
        double bytes_file_write = 0;
        double bytes_page_read = 0;
        double bytes_page_write = 0;
        double block_size = 0;
        ExportedBlockStats block_stats[];
    };

    /// Encode the accesses
    ///
    /// | bytes_file_cold   | bytes_file_ahead
    /// | bytes_file_cached | bytes_file_write
    /// | bytes_page_read   | bytes_page_write
    /// | block_size
    /// | <blocks>
    ///
    /// Block Entry:
    /// lsb      msb | lsb        msb | lsb      msb
    /// 0000    0000 | 0000      0000 | 0000    0000
    /// fwrite fcold | fahead fcached | pwrite pread
    ///
    /// Encoding: at least ((1 << nibble) - 1) times
    arrow::Result<std::shared_ptr<arrow::Buffer>> ExportStatistics() const;
};

class FileStatisticsRegistry {
    /// The mutex
    LightMutex registry_mutex_;
    /// The collectors
    std::unordered_map<std::string, std::shared_ptr<FileStatisticsCollector>> collectors_ = {};

   public:
    /// Find a collector
    std::shared_ptr<FileStatisticsCollector> FindCollector(std::string_view file_name);
    /// Enable a collector (if exists)
    std::shared_ptr<FileStatisticsCollector> EnableCollector(std::string_view file_name, bool enable = true);
    /// Export statistics
    arrow::Result<std::shared_ptr<arrow::Buffer>> ExportStatistics(std::string_view path);
};

}  // namespace io
}  // namespace web
}  // namespace duckdb

#endif
