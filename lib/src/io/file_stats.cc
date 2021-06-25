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
    auto block_count = std::max<size_t>(n >> MIN_RANGE_SHIFT, 1);
    auto block_shift = MIN_RANGE_SHIFT;
    for (; block_count > MAX_RANGE_COUNT; block_count >>= 1, ++block_shift)
        ;
    block_count = ((block_count << block_shift) < n) ? (block_count + 1) : block_count;
    if (block_count == block_count_ && block_shift == block_shift_) return;
    block_stats_ = std::unique_ptr<BlockStatistics[]>(new BlockStatistics[block_count]);
    block_shift_ = block_shift;
    block_count_ = block_count;
    std::memset(block_stats_.get(), 0, block_count_ * sizeof(BlockStatistics));
}

/// Encode the block statistics
arrow::Result<std::shared_ptr<arrow::Buffer>> FileStatisticsCollector::ExportBlockStatistics() const {
    auto buffer = arrow::AllocateBuffer(sizeof(double) + block_count_ * sizeof(uint16_t));
    auto writer = buffer.ValueOrDie()->mutable_data();
    auto* block_size = reinterpret_cast<double*>(writer);
    auto* stats = reinterpret_cast<uint16_t*>(writer + sizeof(double));
    for (size_t i = 0; i < block_count_; ++i) {
        auto& value = stats[i];
        value = 0;
        value |= encodeHits(block_stats_[i].cache);
        value <<= 4;
        value |= encodeHits(block_stats_[i].prefetches);
        value <<= 4;
        value |= encodeHits(block_stats_[i].writes);
        value <<= 4;
        value |= encodeHits(block_stats_[i].reads);
    }
    *block_size = 1 << block_shift_;
    return buffer;
}

}  // namespace io
}  // namespace web
}  // namespace duckdb
