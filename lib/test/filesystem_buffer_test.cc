#include "duckdb/web/io/filesystem_buffer.h"

#include <gtest/gtest.h>

#include <algorithm>
#include <atomic>
#include <condition_variable>
#include <cstdio>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <initializer_list>
#include <memory>
#include <random>
#include <thread>
#include <vector>

#include "duckdb/web/test/config.h"
#include "duckdb/web/io/web_filesystem.h"

using namespace duckdb::web;
namespace fs = std::filesystem;

namespace {

struct TestableFileSystemBuffer : public io::FileSystemBuffer {
    TestableFileSystemBuffer(std::unique_ptr<duckdb::FileSystem> filesystem = io::CreateDefaultFileSystem(),
                             size_t page_capacity = 10, size_t page_size_bits = 13)
        : io::FileSystemBuffer(std::move(filesystem), page_capacity, page_size_bits) {}

    auto& GetFrames() { return frames; }
};

std::filesystem::path CreateTestFile() {
    static uint64_t NEXT_TEST_FILE = 0;

    auto cwd = fs::current_path();
    auto tmp = cwd / ".tmp";
    auto file = tmp / (std::string("test_filesystem_buffer_") + std::to_string(NEXT_TEST_FILE++));
    if (!fs::is_directory(tmp) || !fs::exists(tmp)) fs::create_directory(tmp);
    if (fs::exists(file)) fs::remove(file);
    std::ofstream output(file);
    return file;
}

// NOLINTNEXTLINE
TEST(FileSystemBufferTest, FixSingle) {
    auto filesystem_buffer = std::make_shared<TestableFileSystemBuffer>();
    auto filepath = CreateTestFile();
    auto page_size = filesystem_buffer->GetPageSize();
    auto entry_count = page_size / sizeof(uint64_t);
    auto data_size = entry_count * sizeof(uint64_t);
    std::vector<uint64_t> expected_values(entry_count, 123);

    // Write test values to page
    auto file = filesystem_buffer->OpenFile(filepath.c_str());
    ASSERT_EQ(file.GetFileID(), 0);
    {
        auto page = filesystem_buffer->FixPage(file, 0, true);
        ASSERT_EQ(page.GetData().size(), 0);
        page.RequireSize(data_size);
        std::memcpy(page.GetData().data(), expected_values.data(), data_size);
        page.MarkAsDirty();
    }
    filesystem_buffer->FlushFile(file);

    // Check buffer manager state
    ASSERT_EQ(filesystem_buffer->GetFrames().size(), 1);
    ASSERT_EQ(filesystem_buffer->GetFrames().begin()->second.GetUserCount(), 0);
    ASSERT_EQ(std::vector<uint64_t>{0}, filesystem_buffer->GetFIFOList());
    ASSERT_TRUE(filesystem_buffer->GetLRUList().empty());

    // Read test values from disk
    std::vector<uint64_t> values(entry_count);
    {
        auto page = filesystem_buffer->FixPage(file, 0, false);
        ASSERT_EQ(page.GetData().size(), data_size);
        std::memcpy(values.data(), page.GetData().data(), data_size);
    }

    // Check buffer manager state
    ASSERT_TRUE(filesystem_buffer->GetFIFOList().empty());
    ASSERT_EQ(std::vector<uint64_t>{0}, filesystem_buffer->GetLRUList());
    ASSERT_EQ(expected_values, values);
}

// NOLINTNEXTLINE
TEST(FileSystemBufferTest, PersistentRestart) {
    auto filesystem_buffer = std::make_shared<TestableFileSystemBuffer>();
    auto page_size = filesystem_buffer->GetPageSize();
    auto file1_path = CreateTestFile();
    auto file2_path = CreateTestFile();
    auto file3_path = CreateTestFile();
    std::filesystem::resize_file(file1_path, 10 * page_size);
    std::filesystem::resize_file(file2_path, 10 * page_size);
    std::filesystem::resize_file(file3_path, 10 * page_size);

    std::vector<io::FileSystemBuffer::FileRef> files;
    files.push_back(filesystem_buffer->OpenFile(file1_path.c_str()));
    files.push_back(filesystem_buffer->OpenFile(file2_path.c_str()));
    files.push_back(filesystem_buffer->OpenFile(file3_path.c_str()));
    ASSERT_EQ(files[0].GetFileID(), 0);
    ASSERT_EQ(files[1].GetFileID(), 1);
    ASSERT_EQ(files[2].GetFileID(), 2);

    for (uint16_t file_id = 0; file_id < 3; ++file_id) {
        for (uint64_t page_id = 0; page_id < 10; ++page_id) {
            auto page = filesystem_buffer->FixPage(files[file_id], page_id, true);
            page.RequireSize(page_size);
            auto& value = *reinterpret_cast<uint64_t*>(page.GetData().data());
            value = file_id * 10 + page_id;
            page.MarkAsDirty();
        }
    }
    filesystem_buffer->Flush();
    files.clear();
    ASSERT_EQ(fs::file_size(file1_path), 10 * page_size);
    ASSERT_EQ(fs::file_size(file2_path), 10 * page_size);
    ASSERT_EQ(fs::file_size(file3_path), 10 * page_size);

    // Destroy the buffer manager and create a new one.
    filesystem_buffer = std::make_shared<TestableFileSystemBuffer>();
    files.push_back(filesystem_buffer->OpenFile(file1_path.c_str()));
    files.push_back(filesystem_buffer->OpenFile(file2_path.c_str()));
    files.push_back(filesystem_buffer->OpenFile(file3_path.c_str()));
    ASSERT_EQ(files[0].GetFileID(), 0);
    ASSERT_EQ(files[1].GetFileID(), 1);
    ASSERT_EQ(files[2].GetFileID(), 2);

    // Read all pages back
    for (uint16_t file_id = 0; file_id < 3; ++file_id) {
        for (uint64_t page_id = 0; page_id < 10; ++page_id) {
            auto page = filesystem_buffer->FixPage(files[file_id], page_id, false);
            EXPECT_EQ(page.GetData().size(), page_size);
            auto& value = *reinterpret_cast<uint64_t*>(page.GetData().data());
            EXPECT_EQ(file_id * 10 + page_id, value);
        }
    }
    files.clear();
}

// NOLINTNEXTLINE
TEST(FileSystemBufferTest, FIFOEviction) {
    auto filesystem_buffer = std::make_shared<TestableFileSystemBuffer>(io::CreateDefaultFileSystem(), 10, 13);
    auto filepath = CreateTestFile();
    std::ofstream(filepath).close();
    fs::resize_file(filepath, 10 * filesystem_buffer->GetPageSize());
    auto file = filesystem_buffer->OpenFile(filepath.c_str());

    std::vector<uint64_t> expected_fifo;

    // Allocate first 10 pages in FIFO
    for (uint64_t i = 0; i < 10; ++i) {
        filesystem_buffer->FixPage(file, i, false);
        ASSERT_EQ(filesystem_buffer->GetFrames().size(), i + 1);
    }

    expected_fifo = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};
    EXPECT_EQ(expected_fifo, filesystem_buffer->GetFIFOList());
    EXPECT_TRUE(filesystem_buffer->GetLRUList().empty());

    // Fix page 10 and evict 0 in FIFO
    filesystem_buffer->FixPage(file, 10, false);
    expected_fifo = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    EXPECT_EQ(expected_fifo, filesystem_buffer->GetFIFOList());
    EXPECT_TRUE(filesystem_buffer->GetLRUList().empty());

    // Cycle all pages through FIFO
    for (uint64_t i = 0; i < 10; ++i) {
        filesystem_buffer->FixPage(file, i, false);
    }
    expected_fifo = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};
    EXPECT_EQ(expected_fifo, filesystem_buffer->GetFIFOList());
    EXPECT_TRUE(filesystem_buffer->GetLRUList().empty());
}

// NOLINTNEXTLINE
TEST(FileSystemBufferTest, LRUEviction) {
    auto filesystem_buffer = std::make_shared<TestableFileSystemBuffer>(io::CreateDefaultFileSystem(), 10, 13);
    auto filepath = CreateTestFile();
    std::ofstream(filepath).close();
    fs::resize_file(filepath, 10 * filesystem_buffer->GetPageSize());
    auto file = filesystem_buffer->OpenFile(filepath.c_str());

    std::vector<uint64_t> expected_fifo;
    std::vector<uint64_t> expected_lru;

    // Allocate first 10 pages in FIFO
    for (uint64_t i = 0; i < 10; ++i) {
        filesystem_buffer->FixPage(file, i, false);
        ASSERT_EQ(filesystem_buffer->GetFrames().size(), i + 1);
    }

    expected_fifo = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};
    EXPECT_EQ(expected_fifo, filesystem_buffer->GetFIFOList());
    EXPECT_TRUE(filesystem_buffer->GetLRUList().empty());

    // Fix page 0 again and move it to LRU
    filesystem_buffer->FixPage(file, 0, false);
    expected_fifo = {1, 2, 3, 4, 5, 6, 7, 8, 9};
    expected_lru = {0};
    EXPECT_EQ(expected_fifo, filesystem_buffer->GetFIFOList());
    EXPECT_EQ(expected_lru, filesystem_buffer->GetLRUList());

    // Fix page 10 and evict 1 in FIFO
    filesystem_buffer->FixPage(file, 10, false);
    expected_fifo = {2, 3, 4, 5, 6, 7, 8, 9, 10};
    expected_lru = {0};
    EXPECT_EQ(expected_fifo, filesystem_buffer->GetFIFOList());
    EXPECT_EQ(expected_lru, filesystem_buffer->GetLRUList());

    // Cycle all pages through FIFO
    for (uint64_t i = 1; i < 10; ++i) {
        filesystem_buffer->FixPage(file, i, false);
    }
    expected_fifo = {1, 2, 3, 4, 5, 6, 7, 8, 9};
    expected_lru = {0};
    EXPECT_EQ(expected_fifo, filesystem_buffer->GetFIFOList());
    EXPECT_EQ(expected_lru, filesystem_buffer->GetLRUList());

    // Move all pages to LRU
    for (uint64_t i = 1; i < 10; ++i) {
        filesystem_buffer->FixPage(file, i, false);
    }
    expected_fifo = {};
    expected_lru = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};
    EXPECT_EQ(expected_fifo, filesystem_buffer->GetFIFOList());
    EXPECT_EQ(expected_lru, filesystem_buffer->GetLRUList());

    // Fix page 10 and evict 1 in LRU
    filesystem_buffer->FixPage(file, 10, false);
    expected_fifo = {10};
    expected_lru = {1, 2, 3, 4, 5, 6, 7, 8, 9};
    EXPECT_EQ(expected_fifo, filesystem_buffer->GetFIFOList());
    EXPECT_EQ(expected_lru, filesystem_buffer->GetLRUList());

    // Fix page 0
    filesystem_buffer->FixPage(file, 0, false);
    expected_fifo = {0};
    expected_lru = {1, 2, 3, 4, 5, 6, 7, 8, 9};
    EXPECT_EQ(expected_fifo, filesystem_buffer->GetFIFOList());
    EXPECT_EQ(expected_lru, filesystem_buffer->GetLRUList());
}

}  // namespace
