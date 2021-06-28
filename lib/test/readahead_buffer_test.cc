#include "duckdb/web/io/readahead_buffer.h"

#include <duckdb/common/constants.hpp>
#include <numeric>

#include "gtest/gtest.h"

using namespace duckdb::web::io;
using namespace std;

namespace {

struct TestableReadAheadBuffer : public ReadAheadBuffer {
    TestableReadAheadBuffer() : ReadAheadBuffer() {}

    auto& GetReadHeads() { return read_heads_; }
    auto& GetInvalidations() { return invalidation_mask_; }
};

TEST(ReadAheadBufferTest, SingleRead) {
    constexpr size_t FILE_ID = 0;
    TestableReadAheadBuffer buffer;
    std::vector<uint64_t> in;
    std::vector<uint64_t> out;
    in.resize(100);
    out.resize(100);
    std::iota(in.begin(), in.end(), 0);
    auto file_size = 100 * sizeof(uint64_t);

    auto read = [&](auto* buffer, size_t bytes, duckdb::idx_t offset) -> size_t {
        std::memcpy(buffer, reinterpret_cast<char*>(in.data()) + offset, bytes);
        return bytes;
    };

    auto bytes_read = buffer.Read(FILE_ID, file_size, out.data(), file_size, 0, read);
    ASSERT_EQ(bytes_read, file_size);
    ASSERT_EQ(in, out);
    ASSERT_EQ(buffer.GetReadHeads().back().file_id, FILE_ID);
    ASSERT_EQ(buffer.GetReadHeads().back().offset, file_size);
    ASSERT_EQ(buffer.GetReadHeads().back().buffer_size, 0);  // First read is unbuffered
}

TEST(ReadAheadBufferTest, ConsecutiveReads) {
    constexpr size_t FILE_ID = 0;
    TestableReadAheadBuffer buffer;
    std::vector<uint64_t> in;
    std::vector<uint64_t> out;
    in.resize(4 * 100);
    out.resize(100);
    std::iota(in.begin(), in.end(), 0);
    auto chunk_size = 100 * sizeof(uint64_t);
    auto file_size = 4 * chunk_size;

    auto read = [&](auto* buffer, size_t bytes, duckdb::idx_t offset) -> size_t {
        std::memcpy(buffer, reinterpret_cast<char*>(in.data()) + offset, bytes);
        return bytes;
    };

    // Read first range
    auto bytes_read = buffer.Read(FILE_ID, file_size, out.data(), chunk_size, 0, read);
    ASSERT_EQ(bytes_read, chunk_size);
    ASSERT_EQ(buffer.GetReadHeads().back().file_id, FILE_ID);
    ASSERT_EQ(buffer.GetReadHeads().back().offset, chunk_size);
    ASSERT_EQ(buffer.GetReadHeads().back().speed, chunk_size);
    ASSERT_EQ(buffer.GetReadHeads().back().buffer_size, 0);  // First read is unbuffered

    // Read consecutive range
    bytes_read = buffer.Read(FILE_ID, file_size, out.data(), chunk_size, chunk_size, read);
    ASSERT_EQ(bytes_read, chunk_size);
    ASSERT_EQ(buffer.GetReadHeads().back().file_id, FILE_ID);
    ASSERT_EQ(buffer.GetReadHeads().back().offset, chunk_size);  // Still at chunk_size due to buffering
    ASSERT_EQ(buffer.GetReadHeads().back().speed, chunk_size + chunk_size / READAHEAD_ACCELERATION);
    ASSERT_EQ(buffer.GetReadHeads().back().buffer_size, chunk_size + chunk_size / READAHEAD_ACCELERATION);

    // Re-read range
    bytes_read = buffer.Read(FILE_ID, file_size, out.data(), chunk_size, chunk_size, read);
    ASSERT_EQ(bytes_read, chunk_size);
    ASSERT_EQ(buffer.GetReadHeads().back().file_id, FILE_ID);
    ASSERT_EQ(buffer.GetReadHeads().back().offset, chunk_size);  // Still at chunk_size due to buffering
    ASSERT_EQ(buffer.GetReadHeads().back().speed, chunk_size + chunk_size / READAHEAD_ACCELERATION);
    ASSERT_EQ(buffer.GetReadHeads().back().buffer_size, chunk_size + chunk_size / READAHEAD_ACCELERATION);

    // Read consecutive range
    bytes_read = buffer.Read(FILE_ID, file_size, out.data(), chunk_size, 2 * chunk_size, read);
    ASSERT_EQ(bytes_read, chunk_size / READAHEAD_ACCELERATION);  // Read readahead first
    ASSERT_EQ(buffer.GetReadHeads().back().file_id, FILE_ID);
    ASSERT_EQ(buffer.GetReadHeads().back().offset, chunk_size);  // Still at chunk_size due to buffering
    ASSERT_EQ(buffer.GetReadHeads().back().speed, chunk_size + chunk_size / READAHEAD_ACCELERATION);
    ASSERT_EQ(buffer.GetReadHeads().back().buffer_size, chunk_size + chunk_size / READAHEAD_ACCELERATION);

    auto expected_pos = 2 * chunk_size + bytes_read;
    auto expected_speed = chunk_size;
    expected_speed += expected_speed / READAHEAD_ACCELERATION;
    expected_speed += expected_speed / READAHEAD_ACCELERATION;

    // Read consecutive range
    bytes_read = buffer.Read(FILE_ID, file_size, out.data(), chunk_size, expected_pos, read);
    ASSERT_EQ(bytes_read, chunk_size);
    ASSERT_EQ(buffer.GetReadHeads().back().file_id, FILE_ID);
    ASSERT_EQ(buffer.GetReadHeads().back().offset, expected_pos);
    ASSERT_EQ(buffer.GetReadHeads().back().speed, expected_speed);
    ASSERT_EQ(buffer.GetReadHeads().back().buffer_size, expected_speed);
}

}  // namespace
