#include "duckdb/web/io/file_page_buffer.h"

#include <gtest/gtest.h>

#include <algorithm>
#include <atomic>
#include <condition_variable>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <initializer_list>
#include <memory>
#include <random>
#include <thread>
#include <vector>

#include "duckdb/web/io/web_filesystem.h"
#include "duckdb/web/test/config.h"

using namespace duckdb::web;
namespace fs = std::filesystem;

namespace {

struct TestableFilePageBuffer : public io::FilePageBuffer {
    TestableFilePageBuffer(std::unique_ptr<duckdb::FileSystem> filesystem = duckdb::FileSystem::CreateLocal(),
                           size_t page_capacity = 10, size_t page_size_bits = 14)
        : io::FilePageBuffer(std::move(filesystem), page_capacity, page_size_bits) {}

    auto& GetFrames() { return frames; }
    auto& GetFiles() { return files; }
};

std::filesystem::path CreateTestFile() {
    static uint64_t NEXT_TEST_FILE = 0;

    auto cwd = fs::current_path();
    auto tmp = cwd / ".tmp";
    auto file = tmp / (std::string("test_buffer_") + std::to_string(NEXT_TEST_FILE++));
    if (!fs::is_directory(tmp) || !fs::exists(tmp)) fs::create_directory(tmp);
    if (fs::exists(file)) fs::remove(file);
    std::ofstream output(file);
    return file;
}

// NOLINTNEXTLINE
TEST(FilePageBufferTest, FixSingle) {
    auto buffer = std::make_shared<TestableFilePageBuffer>();
    auto file_path = CreateTestFile();
    auto page_size = buffer->GetPageSize();
    auto entry_count = page_size / sizeof(uint64_t);
    auto data_size = entry_count * sizeof(uint64_t);
    std::vector<uint64_t> expected_values(entry_count, 123);

    // Write test values to page
    auto file_flags = duckdb::FileFlags::FILE_FLAGS_WRITE | duckdb::FileFlags::FILE_FLAGS_READ |
                      duckdb::FileFlags::FILE_FLAGS_FILE_CREATE;
    auto file = buffer->OpenFile(file_path.c_str(), file_flags);
    file->Truncate(data_size);
    ASSERT_EQ(file->GetFileID(), 0);
    {
        auto page = file->FixPage(0, true);
        ASSERT_EQ(page.GetData().size(), buffer->GetPageSize());
        std::memcpy(page.GetData().data(), expected_values.data(), data_size);
        page.MarkAsDirty();
    }
    file->Flush();

    // Check buffer manager state
    ASSERT_TRUE(buffer->BuffersFile(file_path.c_str()));
    ASSERT_EQ(buffer->GetFrames().size(), 1);
    ASSERT_EQ(buffer->GetFrames().begin()->second->GetUserCount(), 0);
    ASSERT_EQ(std::vector<uint64_t>{0}, buffer->GetFIFOList());
    ASSERT_TRUE(buffer->GetLRUList().empty());

    // Read test values from disk
    std::vector<uint64_t> values(entry_count);
    {
        auto page = file->FixPage(0, false);
        ASSERT_EQ(page.GetData().size(), data_size);
        std::memcpy(values.data(), page.GetData().data(), data_size);
    }

    // Check buffer manager state
    ASSERT_TRUE(buffer->GetFIFOList().empty());
    ASSERT_EQ(std::vector<uint64_t>{0}, buffer->GetLRUList());
    ASSERT_EQ(expected_values, values);

    // Close the file.
    // Since there's no more ref, the buffer manager should evict all frames
    file->Release(false);
    ASSERT_FALSE(buffer->BuffersFile(file_path.c_str()));
    ASSERT_EQ(buffer->GetFiles().size(), 0);
    ASSERT_EQ(buffer->GetFrames().size(), 0);
}

// NOLINTNEXTLINE
TEST(FilePageBufferTest, PersistentRestart) {
    auto buffer = std::make_shared<TestableFilePageBuffer>();
    auto page_size = buffer->GetPageSize();
    auto file1_path = CreateTestFile();
    auto file2_path = CreateTestFile();
    auto file3_path = CreateTestFile();
    std::filesystem::resize_file(file1_path, 10 * page_size);
    std::filesystem::resize_file(file2_path, 10 * page_size);
    std::filesystem::resize_file(file3_path, 10 * page_size);

    std::vector<std::unique_ptr<io::FilePageBuffer::FileRef>> files;
    auto file_flags = duckdb::FileFlags::FILE_FLAGS_WRITE | duckdb::FileFlags::FILE_FLAGS_READ |
                      duckdb::FileFlags::FILE_FLAGS_FILE_CREATE;
    files.push_back(buffer->OpenFile(file1_path.c_str(), file_flags));
    files.push_back(buffer->OpenFile(file2_path.c_str(), file_flags));
    files.push_back(buffer->OpenFile(file3_path.c_str(), file_flags));
    ASSERT_EQ(files[0]->GetFileID(), 0);
    ASSERT_EQ(files[1]->GetFileID(), 1);
    ASSERT_EQ(files[2]->GetFileID(), 2);
    constexpr size_t PageCount = 10;
    files[0]->Truncate(PageCount * buffer->GetPageSize());
    files[1]->Truncate(PageCount * buffer->GetPageSize());
    files[2]->Truncate(PageCount * buffer->GetPageSize());

    for (uint16_t file_id = 0; file_id < 3; ++file_id) {
        for (uint64_t page_id = 0; page_id < PageCount; ++page_id) {
            auto page = files[file_id]->FixPage(page_id, true);
            auto& value = *reinterpret_cast<uint64_t*>(page.GetData().data());
            value = file_id * 10 + page_id;
            page.MarkAsDirty();
        }
    }
    buffer->FlushFiles();
    files.clear();
    ASSERT_EQ(fs::file_size(file1_path), PageCount * page_size);
    ASSERT_EQ(fs::file_size(file2_path), PageCount * page_size);
    ASSERT_EQ(fs::file_size(file3_path), PageCount * page_size);

    // Destroy the buffer manager and create a new one.
    buffer = nullptr;
    buffer = std::make_shared<TestableFilePageBuffer>();
    file_flags = duckdb::FileFlags::FILE_FLAGS_READ;
    files.push_back(buffer->OpenFile(file1_path.c_str(), file_flags));
    files.push_back(buffer->OpenFile(file2_path.c_str(), file_flags));
    files.push_back(buffer->OpenFile(file3_path.c_str(), file_flags));
    ASSERT_EQ(files[0]->GetFileID(), 0);
    ASSERT_EQ(files[1]->GetFileID(), 1);
    ASSERT_EQ(files[2]->GetFileID(), 2);

    // Read all pages back
    for (uint16_t file_id = 0; file_id < 3; ++file_id) {
        for (uint64_t page_id = 0; page_id < 10; ++page_id) {
            auto page = files[file_id]->FixPage(page_id, false);
            EXPECT_EQ(page.GetData().size(), page_size);
            auto& value = *reinterpret_cast<uint64_t*>(page.GetData().data());
            EXPECT_EQ(file_id * 10 + page_id, value);
        }
    }
    files.clear();

    // The second time, all files were opened read-only.
    // Therefore closing the files kept their frames alive
    ASSERT_EQ(buffer->GetFiles().size(), 3);
    ASSERT_EQ(buffer->GetFrames().size(), 10);

    // Drop them explicitly
    buffer->DropDanglingFiles();
    ASSERT_EQ(buffer->GetFiles().size(), 0);
    ASSERT_EQ(buffer->GetFrames().size(), 0);
}

// NOLINTNEXTLINE
TEST(FilePageBufferTest, FIFOEviction) {
    auto buffer = std::make_shared<TestableFilePageBuffer>(duckdb::FileSystem::CreateLocal(), 10, 13);
    auto file_path = CreateTestFile();
    std::ofstream(file_path).close();
    auto data_size = 10 * buffer->GetPageSize();
    fs::resize_file(file_path, 10 * buffer->GetPageSize());
    auto file_flags = duckdb::FileFlags::FILE_FLAGS_WRITE | duckdb::FileFlags::FILE_FLAGS_READ |
                      duckdb::FileFlags::FILE_FLAGS_FILE_CREATE;
    auto file = buffer->OpenFile(file_path.c_str(), file_flags);
    file->Truncate(data_size);

    std::vector<uint64_t> expected_fifo;

    // Allocate first 10 pages in FIFO
    for (uint64_t i = 0; i < 10; ++i) {
        file->FixPage(i, false);
        ASSERT_EQ(buffer->GetFrames().size(), i + 1);
    }

    expected_fifo = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};
    EXPECT_EQ(expected_fifo, buffer->GetFIFOList());
    EXPECT_TRUE(buffer->GetLRUList().empty());

    // Fix page 10 and evict 0 in FIFO
    file->FixPage(10, false);
    expected_fifo = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    EXPECT_EQ(expected_fifo, buffer->GetFIFOList());
    EXPECT_TRUE(buffer->GetLRUList().empty());

    // Cycle all pages through FIFO
    for (uint64_t i = 0; i < 10; ++i) {
        file->FixPage(i, false);
    }
    expected_fifo = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};
    EXPECT_EQ(expected_fifo, buffer->GetFIFOList());
    EXPECT_TRUE(buffer->GetLRUList().empty());

    file->Release(false);
    ASSERT_EQ(buffer->GetFiles().size(), 0);
    ASSERT_EQ(buffer->GetFrames().size(), 0);
}

// NOLINTNEXTLINE
TEST(FilePageBufferTest, LRUEviction) {
    auto buffer = std::make_shared<TestableFilePageBuffer>(duckdb::FileSystem::CreateLocal(), 10, 13);
    auto file_path = CreateTestFile();
    std::ofstream(file_path).close();
    auto data_size = 11 * buffer->GetPageSize();
    fs::resize_file(file_path, data_size);
    auto file_flags = duckdb::FileFlags::FILE_FLAGS_WRITE | duckdb::FileFlags::FILE_FLAGS_READ |
                      duckdb::FileFlags::FILE_FLAGS_FILE_CREATE;
    auto file = buffer->OpenFile(file_path.c_str(), file_flags);
    file->Truncate(data_size);

    std::vector<uint64_t> expected_fifo;
    std::vector<uint64_t> expected_lru;

    // Allocate first 10 pages in FIFO
    for (uint64_t i = 0; i < 10; ++i) {
        file->FixPage(i, false);
        ASSERT_EQ(buffer->GetFrames().size(), i + 1);
    }

    expected_fifo = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};
    EXPECT_EQ(expected_fifo, buffer->GetFIFOList());
    EXPECT_TRUE(buffer->GetLRUList().empty());

    // Fix page 0 again and move it to LRU
    file->FixPage(0, false);
    expected_fifo = {1, 2, 3, 4, 5, 6, 7, 8, 9};
    expected_lru = {0};
    EXPECT_EQ(expected_fifo, buffer->GetFIFOList());
    EXPECT_EQ(expected_lru, buffer->GetLRUList());

    // Fix page 10 and evict 1 in FIFO
    file->FixPage(10, false);
    expected_fifo = {2, 3, 4, 5, 6, 7, 8, 9, 10};
    expected_lru = {0};
    EXPECT_EQ(expected_fifo, buffer->GetFIFOList());
    EXPECT_EQ(expected_lru, buffer->GetLRUList());

    // Cycle all pages through FIFO
    for (uint64_t i = 1; i < 10; ++i) {
        file->FixPage(i, false);
    }
    expected_fifo = {1, 2, 3, 4, 5, 6, 7, 8, 9};
    expected_lru = {0};
    EXPECT_EQ(expected_fifo, buffer->GetFIFOList());
    EXPECT_EQ(expected_lru, buffer->GetLRUList());

    // Move all pages to LRU
    for (uint64_t i = 1; i < 10; ++i) {
        file->FixPage(i, false);
    }
    expected_fifo = {};
    expected_lru = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};
    EXPECT_EQ(expected_fifo, buffer->GetFIFOList());
    EXPECT_EQ(expected_lru, buffer->GetLRUList());

    // Fix page 10 and evict 1 in LRU
    file->FixPage(10, false);
    expected_fifo = {10};
    expected_lru = {1, 2, 3, 4, 5, 6, 7, 8, 9};
    EXPECT_EQ(expected_fifo, buffer->GetFIFOList());
    EXPECT_EQ(expected_lru, buffer->GetLRUList());

    // Fix page 0
    file->FixPage(0, false);
    expected_fifo = {0};
    expected_lru = {1, 2, 3, 4, 5, 6, 7, 8, 9};
    EXPECT_EQ(expected_fifo, buffer->GetFIFOList());
    EXPECT_EQ(expected_lru, buffer->GetLRUList());

    file->Release(false);
    ASSERT_FALSE(buffer->BuffersFile(file_path.c_str()));
    ASSERT_EQ(buffer->GetFiles().size(), 0);
    ASSERT_EQ(buffer->GetFrames().size(), 0);
}

// NOLINTNEXTLINE
TEST(FilePageBufferTest, ParallelFix) {
    auto buffer = std::make_shared<TestableFilePageBuffer>(duckdb::FileSystem::CreateLocal(), 10, 13);
    auto file_path = CreateTestFile();
    auto data_size = 10 * buffer->GetPageSize();
    std::ofstream(file_path).close();
    fs::resize_file(file_path, data_size);
    auto file_flags = duckdb::FileFlags::FILE_FLAGS_WRITE | duckdb::FileFlags::FILE_FLAGS_READ |
                      duckdb::FileFlags::FILE_FLAGS_FILE_CREATE;
    auto file = buffer->OpenFile(file_path.c_str(), file_flags);
    file->Truncate(data_size);
    std::vector<std::thread> threads;
    for (size_t i = 0; i < 4; ++i) {
        threads.emplace_back([i, &buffer, &file] {
            // NOLINTNEXTLINE
            ASSERT_NO_THROW(auto page1 = file->FixPage(i, false); auto page2 = file->FixPage(i + 4, false);
                            page2.Release(); page1.Release(););
        });
    }
    for (auto& thread : threads) {
        thread.join();
    }
    auto fifo_list = buffer->GetFIFOList();
    std::sort(fifo_list.begin(), fifo_list.end());
    std::vector<uint64_t> expected_fifo{0, 1, 2, 3, 4, 5, 6, 7};
    EXPECT_EQ(expected_fifo, fifo_list);
    EXPECT_TRUE(buffer->GetLRUList().empty());

    file->Release(false);
    ASSERT_FALSE(buffer->BuffersFile(file_path.c_str()));
    ASSERT_EQ(buffer->GetFiles().size(), 0);
    ASSERT_EQ(buffer->GetFrames().size(), 0);
}

// NOLINTNEXTLINE
TEST(FilePageBufferTest, ParallelExclusiveAccess) {
    auto buffer = std::make_shared<TestableFilePageBuffer>(duckdb::FileSystem::CreateLocal(), 10, 13);
    auto file_path = CreateTestFile();
    auto data_size = 10 * buffer->GetPageSize();
    std::ofstream(file_path).close();
    fs::resize_file(file_path, data_size);
    auto file_flags = duckdb::FileFlags::FILE_FLAGS_WRITE | duckdb::FileFlags::FILE_FLAGS_READ |
                      duckdb::FileFlags::FILE_FLAGS_FILE_CREATE;
    auto file = buffer->OpenFile(file_path.c_str(), file_flags);
    {
        auto page = file->FixPage(0, true);
        auto page_data = page.GetData();
        ASSERT_EQ(page_data.size(), buffer->GetPageSize());
        std::memset(page_data.data(), 0, buffer->GetPageSize());
        page.MarkAsDirty();
    }
    std::vector<std::thread> threads;
    for (size_t i = 0; i < 4; ++i) {
        threads.emplace_back([&buffer, &file] {
            for (size_t j = 0; j < 1000; ++j) {
                auto page = file->FixPage(0, true);
                auto page_data = page.GetData();
                uint64_t& value = *reinterpret_cast<uint64_t*>(page_data.data());
                ++value;
                page.MarkAsDirty();
            }
        });
    }
    for (auto& thread : threads) {
        thread.join();
    }
    {
        EXPECT_TRUE(buffer->GetFIFOList().empty());
        EXPECT_EQ(std::vector<uint64_t>{0}, buffer->GetLRUList());
        auto page = file->FixPage(0, false);
        auto page_data = page.GetData();
        uint64_t value = *reinterpret_cast<uint64_t*>(page_data.data());
        EXPECT_EQ(4000, value);
    }
    file->Release(false);
    ASSERT_FALSE(buffer->BuffersFile(file_path.c_str()));
    ASSERT_EQ(buffer->GetFiles().size(), 0);
    ASSERT_EQ(buffer->GetFrames().size(), 0);
}

// NOLINTNEXTLINE
TEST(FilePageBufferTest, ParallelScans) {
    constexpr size_t PageCount = 1000;
    constexpr size_t ThreadCount = 2;
    constexpr size_t JobCount = 10;

    // Prepare test files
    std::vector<std::filesystem::path> test_files{
        CreateTestFile(),
        CreateTestFile(),
        CreateTestFile(),
        CreateTestFile(),
    };
    {
        auto buffer = std::make_shared<TestableFilePageBuffer>(duckdb::FileSystem::CreateLocal(), 10, 13);
        for (auto& file_path : test_files) {
            // Open file
            std::ofstream(file_path).close();
            fs::resize_file(file_path, PageCount * buffer->GetPageSize());
            auto file_flags = duckdb::FileFlags::FILE_FLAGS_WRITE | duckdb::FileFlags::FILE_FLAGS_READ |
                              duckdb::FileFlags::FILE_FLAGS_FILE_CREATE;
            auto file_ref = buffer->OpenFile(file_path.c_str(), file_flags);

            // Zero out pages
            for (uint64_t page_id = 0; page_id < PageCount; ++page_id) {
                auto page = file_ref->FixPage(page_id, true);
                auto page_data = page.GetData();
                ASSERT_EQ(page_data.size(), buffer->GetPageSize());
                std::memset(page_data.data(), 0, buffer->GetPageSize());
                page.MarkAsDirty();
            }

            file_ref->Release(false);
        }
        for (auto& file_path : test_files) {
            ASSERT_FALSE(buffer->BuffersFile(file_path.c_str()));
        }
        // Let the buffer manager be destroyed here so that the caches are
        // empty before running the actual test.
    }

    auto buffer = std::make_shared<TestableFilePageBuffer>(duckdb::FileSystem::CreateLocal(), 10, 13);
    std::vector<std::thread> threads;

    for (size_t i = 0; i < ThreadCount; ++i) {
        threads.emplace_back([i, &buffer, &test_files] {
            std::mt19937_64 engine{i};
            // Out of 20 accesses, 12 are from segment 0, 5 from segment 1,
            // 2 from segment 2, and 1 from segment 3.
            std::discrete_distribution<uint16_t> segment_distr{12.0, 5.0, 2.0, 1.0};

            // Open all files once per thread to isolate but
            std::vector<std::unique_ptr<TestableFilePageBuffer::FileRef>> file_refs;
            for (auto& file_path : test_files) {
                auto file_flags = duckdb::FileFlags::FILE_FLAGS_WRITE | duckdb::FileFlags::FILE_FLAGS_READ |
                                  duckdb::FileFlags::FILE_FLAGS_FILE_CREATE;
                file_refs.push_back(buffer->OpenFile(file_path.c_str(), file_flags));
            }

            // Run all scans
            for (size_t j = 0; j < JobCount; ++j) {
                // Open a file
                uint16_t file_id = segment_distr(engine);
                auto& file = file_refs[file_id];

                // Scan all pages
                uint64_t scan_sum = 0;
                for (uint64_t page_id = 0; page_id < PageCount; ++page_id) {
                    auto page = file->FixPage(page_id, false);
                    auto page_data = page.GetData();
                    uint64_t value = *reinterpret_cast<uint64_t*>(page_data.data());
                    ASSERT_EQ(value, 0) << "j=" << j << " page=" << page_id;
                }
            }

            for (auto& file : file_refs) {
                file->Release(false);
            }
        });
    }

    // Join all threads
    for (auto& thread : threads) {
        thread.join();
    }
    ASSERT_EQ(buffer->GetFiles().size(), 0);
    ASSERT_EQ(buffer->GetFrames().size(), 0);
}

// NOLINTNEXTLINE
TEST(FilePageBufferTest, ParallelReaderWriter) {
    constexpr size_t PageCount = 10;
    constexpr size_t ThreadCount = 4;
    constexpr size_t JobCount = 100;

    // Prepare test files
    std::vector<std::filesystem::path> test_files{
        CreateTestFile(),
        CreateTestFile(),
        CreateTestFile(),
        CreateTestFile(),
    };
    {
        auto buffer = std::make_shared<TestableFilePageBuffer>(duckdb::FileSystem::CreateLocal(), 10, 13);
        for (auto& file_path : test_files) {
            // Open file
            std::ofstream(file_path).close();
            fs::resize_file(file_path, PageCount * buffer->GetPageSize());
            auto file_flags = duckdb::FileFlags::FILE_FLAGS_WRITE | duckdb::FileFlags::FILE_FLAGS_READ |
                              duckdb::FileFlags::FILE_FLAGS_FILE_CREATE;
            auto file_ref = buffer->OpenFile(file_path.c_str(), file_flags);

            // Zero out pages
            for (uint64_t page_id = 0; page_id < PageCount; ++page_id) {
                auto page = file_ref->FixPage(page_id, true);
                auto page_data = page.GetData();
                ASSERT_EQ(page_data.size(), buffer->GetPageSize());
                std::memset(page_data.data(), 0, buffer->GetPageSize());
                page.MarkAsDirty();
            }

            file_ref->Release(false);
        }
        for (auto& file_path : test_files) {
            ASSERT_FALSE(buffer->BuffersFile(file_path.c_str()));
        }

        // Let the buffer manager be destroyed here so that the caches are
        // empty before running the actual test.
    }

    auto buffer = std::make_shared<TestableFilePageBuffer>(duckdb::FileSystem::CreateLocal(), 10, 13);
    std::vector<std::thread> threads;

    for (size_t i = 0; i < ThreadCount; ++i) {
        threads.emplace_back([i, &buffer, &test_files] {
            std::mt19937_64 engine{i};
            // 5% of queries are scans.
            std::bernoulli_distribution scan_distr{0.05};
            // Number of pages accessed by a point query is geometrically
            // distributed.
            std::geometric_distribution<size_t> num_pages_distr{0.5};
            // 60% of point queries are reads.
            std::bernoulli_distribution reads_distr{0.6};
            // Out of 20 accesses, 12 are from segment 0, 5 from segment 1,
            // 2 from segment 2, and 1 from segment 3.
            std::discrete_distribution<uint16_t> segment_distr{12.0, 5.0, 2.0, 1.0};
            // Page accesses for point queries are uniformly distributed in
            // [0, 100].
            std::uniform_int_distribution<uint64_t> page_distr{0, PageCount};
            // Track the sums that we saw during scans.
            // These sums must increase monotonically per thread.
            std::vector<uint64_t> scan_sums(test_files.size(), 0);

            for (size_t j = 0; j < JobCount; ++j) {
                // Open a file
                uint16_t file_id = segment_distr(engine);
                auto file_flags = duckdb::FileFlags::FILE_FLAGS_WRITE | duckdb::FileFlags::FILE_FLAGS_READ |
                                  duckdb::FileFlags::FILE_FLAGS_FILE_CREATE;
                auto file = buffer->OpenFile(test_files[file_id].c_str(), file_flags);

                // Run a table scan?
                if (scan_distr(engine)) {
                    // Scan all pages
                    uint64_t scan_sum = 0;
                    for (uint64_t page_id = 0; page_id < PageCount; ++page_id) {
                        auto page = file->FixPage(page_id, false);
                        auto page_data = page.GetData();
                        uint64_t value = *reinterpret_cast<uint64_t*>(page_data.data());
                        scan_sum += value;
                    }
                    EXPECT_GE(scan_sum, scan_sums[file_id]);
                    scan_sums[file_id] = scan_sum;
                } else {
                    // Otherwise run a point query
                    auto num_pages = num_pages_distr(engine) + 1;
                    // For point queries all accesses but the last are always
                    // reads. Only the last is potentially a write. Also,
                    // all pages but the last are held for the entire duration
                    // of the query.
                    std::vector<TestableFilePageBuffer::BufferRef> pages;
                    for (size_t page_number = 0; page_number < num_pages - 1; ++page_number) {
                        pages.push_back(file->FixPage(page_distr(engine), false));
                    }
                    // Unfix all pages before accessing the last one
                    // (potentially exclusively) to avoid deadlocks.
                    pages.clear();
                    // Either read or write the page
                    if (reads_distr(engine)) {
                        // Simulate a read of the page
                        file->FixPage(page_distr(engine), false);
                    } else {
                        // Increment the value within the page
                        auto page = file->FixPage(page_distr(engine), true);
                        auto page_data = page.GetData();
                        uint64_t& value = *reinterpret_cast<uint64_t*>(page_data.data());
                        ++value;
                        page.MarkAsDirty();
                    }
                }

                file->Release(false);
            }
        });
    }

    // Join all threads
    for (auto& thread : threads) {
        thread.join();
    }
    ASSERT_EQ(buffer->GetFiles().size(), 0);
    ASSERT_EQ(buffer->GetFrames().size(), 0);
}

TEST(FilePageBufferTest, BlockStatistics) {
    auto buffer =
        std::make_shared<TestableFilePageBuffer>(duckdb::FileSystem::CreateLocal(), 10, io::DEFAULT_FILE_PAGE_SHIFT);
    auto file_path = CreateTestFile();
    auto data_size = 2 * buffer->GetPageSize();
    std::ofstream(file_path).close();
    fs::resize_file(file_path, data_size);
    auto file_flags = duckdb::FileFlags::FILE_FLAGS_WRITE | duckdb::FileFlags::FILE_FLAGS_READ |
                      duckdb::FileFlags::FILE_FLAGS_FILE_CREATE;
    auto file = buffer->OpenFile(file_path.c_str(), file_flags);
    file->Truncate(data_size);

    auto stats_reg = std::make_shared<io::FileStatisticsRegistry>();
    auto stats_collector = stats_reg->EnableCollector(file_path.c_str());
    ASSERT_NE(stats_collector, nullptr);
    buffer->ConfigureFileStatistics(stats_reg);
    buffer->CollectFileStatistics(file_path.c_str(), stats_collector);

    std::vector<char> out;
    out.resize(data_size);
    file->Read(out.data(), buffer->GetPageSize(), 0);
    file->Read(out.data(), buffer->GetPageSize(), 0);
    file->Read(out.data(), buffer->GetPageSize(), 0);
    file->Read(out.data(), buffer->GetPageSize(), 0);
    file->Read(out.data(), buffer->GetPageSize(), 0);
    file->Read(out.data(), buffer->GetPageSize(), buffer->GetPageSize());
    file->Read(out.data(), buffer->GetPageSize(), buffer->GetPageSize());
    file->Read(out.data(), buffer->GetPageSize(), buffer->GetPageSize());
    file->Read(out.data(), buffer->GetPageSize(), buffer->GetPageSize());
    file->Read(out.data(), buffer->GetPageSize(), buffer->GetPageSize());

    auto stats_buffer = stats_reg->ExportStatistics(file_path.c_str());
    ASSERT_NE(stats_buffer, nullptr);
    ASSERT_TRUE(stats_buffer.ok()) << stats_buffer.status().message();
    auto reader = stats_buffer.ValueUnsafe()->data();
    auto stats = reinterpret_cast<const io::FileStatisticsCollector::ExportFileStatistics*>(reader);
    ASSERT_GE(stats_buffer.ValueUnsafe()->size(), sizeof(io::FileStatisticsCollector::ExportFileStatistics));
    ASSERT_EQ(stats->block_size, 1 << io::DEFAULT_FILE_PAGE_SHIFT);

    ASSERT_EQ(stats_buffer.ValueUnsafe()->size(), sizeof(io::FileStatisticsCollector::ExportFileStatistics) +
                                                      sizeof(io::FileStatisticsCollector::ExportedBlockStats) * 2);
    ASSERT_EQ(stats->block_size, 1 << io::DEFAULT_FILE_PAGE_SHIFT);

    // We should see 1 read and 4 cache hits
    for (size_t i = 0; i < 2; ++i) {
        auto fwrite = stats->block_stats[i][0] & 0b1111;
        auto fcold = stats->block_stats[i][0] >> 4;
        auto fahead = stats->block_stats[i][1] & 0b1111;
        auto fcached = stats->block_stats[i][1] >> 4;
        auto paccess = stats->block_stats[i][2] & 0b1111;
        auto pload = stats->block_stats[i][2] >> 4;

        ASSERT_EQ(fwrite, 0);
        ASSERT_EQ(fcold, 0);
        ASSERT_EQ(fahead, 0);
        ASSERT_EQ(fcached, 0);
        ASSERT_EQ(paccess, 2);  // (1 << 2) - 1: >= 3, (1 << 3) - 1: >= 7
        ASSERT_EQ(pload, 1);
    }
}

}  // namespace
