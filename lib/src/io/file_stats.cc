#include "duckdb/web/io/file_stats.h"

#include <cstdint>
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
        }
    }
    return hitsGEQ;
};

/// Encode the page statistics
arrow::Result<std::shared_ptr<arrow::Buffer>> FileStatisticsCollector::ExportPageStatistics() const {
    auto buffer = arrow::AllocateBuffer(page_count_ * sizeof(uint16_t));
    auto stats = reinterpret_cast<uint16_t*>(buffer->get());
    for (size_t i = 0; i < page_count_; ++i) {
        auto& value = stats[i];
        value |= encodeHits(page_stats_[i].prefetches);
        value <<= 4;
        value |= encodeHits(page_stats_[i].writes);
        value <<= 4;
        value |= encodeHits(page_stats_[i].reads);
    }
    return buffer;
}

}  // namespace io
}  // namespace web
}  // namespace duckdb
