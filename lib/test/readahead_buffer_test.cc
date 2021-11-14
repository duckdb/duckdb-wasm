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
    constexpr auto FILE_SIZE = 2 * READAHEAD_BASE + READAHEAD_BASE * READAHEAD_ACCELERATION;
    constexpr auto CHUNK_SIZE = 1024;
    TestableReadAheadBuffer buffer;
    std::vector<char> in;
    std::vector<char> out;
    in.resize(FILE_SIZE);
    out.resize(FILE_SIZE);
    std::iota(in.begin(), in.end(), 0);

    auto read = [&](auto* buffer, size_t bytes, duckdb::idx_t offset) -> size_t {
        std::memcpy(buffer, reinterpret_cast<char*>(in.data()) + offset, bytes);
        return bytes;
    };

    // Read first range
    auto bytes_read = buffer.Read(FILE_ID, FILE_SIZE, out.data(), CHUNK_SIZE, 0, read);
    ASSERT_EQ(bytes_read, CHUNK_SIZE);
    ASSERT_EQ(buffer.GetReadHeads().back().file_id, FILE_ID);
    ASSERT_EQ(buffer.GetReadHeads().back().offset, CHUNK_SIZE);
    ASSERT_EQ(buffer.GetReadHeads().back().speed, CHUNK_SIZE);
    ASSERT_EQ(buffer.GetReadHeads().back().buffer_size, 0);  // First read is unbuffered

    // Read consecutive range
    bytes_read = buffer.Read(FILE_ID, FILE_SIZE, out.data(), CHUNK_SIZE, CHUNK_SIZE, read);
    ASSERT_EQ(bytes_read, CHUNK_SIZE);
    ASSERT_EQ(buffer.GetReadHeads().back().file_id, FILE_ID);
    ASSERT_EQ(buffer.GetReadHeads().back().offset, CHUNK_SIZE);     // Still at chunk_size due to buffering
    ASSERT_EQ(buffer.GetReadHeads().back().speed, READAHEAD_BASE);  // bumped to base size
    ASSERT_EQ(buffer.GetReadHeads().back().buffer_size, READAHEAD_BASE);
    auto n = READAHEAD_BASE;

    // Re-read range
    bytes_read = buffer.Read(FILE_ID, FILE_SIZE, out.data(), CHUNK_SIZE, CHUNK_SIZE, read);
    ASSERT_EQ(bytes_read, CHUNK_SIZE);
    ASSERT_EQ(buffer.GetReadHeads().back().file_id, FILE_ID);
    ASSERT_EQ(buffer.GetReadHeads().back().offset, CHUNK_SIZE);  // Still at chunk_size due to buffering
    ASSERT_EQ(buffer.GetReadHeads().back().speed, READAHEAD_BASE);
    ASSERT_EQ(buffer.GetReadHeads().back().buffer_size, READAHEAD_BASE);

    // Read remainder of readahead
    bytes_read = buffer.Read(FILE_ID, FILE_SIZE, out.data(), READAHEAD_BASE - CHUNK_SIZE, CHUNK_SIZE, read);
    ASSERT_EQ(bytes_read, READAHEAD_BASE - CHUNK_SIZE);  // Read readahead first
    ASSERT_EQ(buffer.GetReadHeads().back().file_id, FILE_ID);
    ASSERT_EQ(buffer.GetReadHeads().back().offset, CHUNK_SIZE);
    ASSERT_EQ(buffer.GetReadHeads().back().speed, READAHEAD_BASE);
    ASSERT_EQ(buffer.GetReadHeads().back().buffer_size, READAHEAD_BASE);

    // Read consecutive range
    bytes_read = buffer.Read(FILE_ID, FILE_SIZE, out.data(), CHUNK_SIZE, CHUNK_SIZE + READAHEAD_BASE, read);
    ASSERT_EQ(bytes_read, CHUNK_SIZE);
    ASSERT_EQ(buffer.GetReadHeads().back().file_id, FILE_ID);
    ASSERT_EQ(buffer.GetReadHeads().back().offset, CHUNK_SIZE + READAHEAD_BASE);
    ASSERT_EQ(buffer.GetReadHeads().back().speed, READAHEAD_ACCELERATION * READAHEAD_BASE);
    ASSERT_EQ(buffer.GetReadHeads().back().buffer_size, READAHEAD_ACCELERATION * READAHEAD_BASE);

    // Read consecutive range
    auto ofs = CHUNK_SIZE + READAHEAD_BASE + READAHEAD_ACCELERATION * READAHEAD_BASE;
    auto speed = READAHEAD_BASE * READAHEAD_ACCELERATION * READAHEAD_ACCELERATION;
    bytes_read = buffer.Read(FILE_ID, FILE_SIZE, out.data(), CHUNK_SIZE, ofs, read);
    ASSERT_EQ(bytes_read, CHUNK_SIZE);
    ASSERT_EQ(buffer.GetReadHeads().back().file_id, FILE_ID);
    ASSERT_EQ(buffer.GetReadHeads().back().offset, ofs);
    ASSERT_EQ(buffer.GetReadHeads().back().speed, speed);
    ASSERT_EQ(buffer.GetReadHeads().back().buffer_size, FILE_SIZE - ofs);
}

}  // namespace
