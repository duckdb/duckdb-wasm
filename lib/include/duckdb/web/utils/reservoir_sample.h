#ifndef INCLUDE_DUCKDB_WEB_UTILS_RESERVOIR_SAMPLE_H_
#define INCLUDE_DUCKDB_WEB_UTILS_RESERVOIR_SAMPLE_H_

#include <atomic>
#include <chrono>
#include <functional>
#include <memory>
#include <random>
#include <vector>

namespace duckdb {
namespace web {

/// A counter for reservoir sampling
struct ReservoirSampleCounter {
   protected:
    /// The capacity
    const size_t capacity_ = 0;
    /// The size
    size_t size_ = 0;
    /// The random engine
    std::mt19937_64 mt_;
    /// The distribution for random numbers
    std::uniform_real_distribution<double> double_dist_;
    /// The distribution for random slots
    std::uniform_int_distribution<uint64_t> slot_dist_;
    /// The W of Li's algorithm L
    double w_;
    /// The next skip
    unsigned skip_;
    /// The seen elements
    unsigned seen_;

   public:
    /// Constructor
    ReservoirSampleCounter(unsigned cap = 1024, uint64_t seed = 0)
        : capacity_(cap),
          size_(0),
          mt_(seed),
          double_dist_(0.0, 1.0),
          slot_dist_(0, cap - 1),
          w_(0.0),
          skip_(0),
          seen_(0) {
        // Calculate initial skip after algorithm l https://doi.org/10.1145/198429.198435
        w_ = std::exp(std::log(double_dist_(mt_)) / cap);
        skip_ = static_cast<uint64_t>(std::floor(std::log(double_dist_(mt_)) / std::log(1.0 - w_)));
    }

    /// Add a range to the sample
    inline std::optional<size_t> Insert() {
        // Reservoir empty?
        if (size_ < capacity_) {
            return size_++;
        }
        // Include in sample?
        if (skip_-- > 1) {
            auto slot = slot_dist_(mt_);

            // Compute next step after algorithm l https://doi.org/10.1145/198429.198435
            skip_ = static_cast<uint64_t>(std::floor(std::log(double_dist_(mt_)) / std::log(1.0 - w_)));
            w_ *= std::exp(std::log(double_dist_(mt_)) / capacity_);
            return slot;
        }
        return std::nullopt;
    }
};

}  // namespace web
}  // namespace duckdb

#endif
