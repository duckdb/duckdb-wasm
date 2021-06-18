#include "duckdb/web/io/file_stats.h"

#include <cstdint>
#include <iostream>
#include <limits>

#include "arrow/buffer.h"
#include "arrow/result.h"

namespace duckdb {
namespace web {
namespace io {

/// Encode the hits
static uint16_t encodeHits(uint64_t hits) {
    size_t hitsGEQ = 0;
    for (size_t value = 0; value < 16; ++value) {
        if (hits >= ((1 << value) - 1)) {
            hitsGEQ = value;
        } else {
            break;
        }
    }
    return hitsGEQ;
};

/// Resize the file
void FileStatisticsCollector::Resize(uint64_t n) {
    auto range_count = std::max<size_t>(n >> MIN_RANGE_SHIFT, 1);
    auto range_shift = MIN_RANGE_SHIFT;
    for (; range_count > MAX_RANGE_COUNT; range_count >>= 1, ++range_shift)
        ;
    if (range_count == range_count_ && range_shift == range_shift_) return;
    range_stats_ = std::unique_ptr<RangeStatistics[]>(new RangeStatistics[range_count]);
    range_shift_ = range_shift;
    range_count_ = range_count;
    std::memset(range_stats_.get(), 0, range_count_ * sizeof(RangeStatistics));
}

/// Encode the range statistics
arrow::Result<std::shared_ptr<arrow::Buffer>> FileStatisticsCollector::ExportRangeStatistics() const {
    auto buffer = arrow::AllocateBuffer(range_count_ * sizeof(uint16_t));
    auto* stats = reinterpret_cast<uint16_t*>(buffer.ValueOrDie()->mutable_data());
    for (size_t i = 0; i < range_count_; ++i) {
        auto& value = stats[i];
        value = 0;
        value |= encodeHits(range_stats_[i].prefetches);
        value <<= 4;
        value |= encodeHits(range_stats_[i].writes);
        value <<= 4;
        value |= encodeHits(range_stats_[i].reads);
    }
    return buffer;
}

}  // namespace io
}  // namespace web
}  // namespace duckdb
