#include "duckdb/web/io/web_filesystem.h"

#include <gtest/gtest.h>

using namespace duckdb::web::io;

namespace {

TEST(WebFileSystemTest, ReadStatistics) {
    WebFileSystem webfs;
    std::unique_ptr<char[]> buffer{new char[32 * sizeof(uint32_t)]};
    auto writer = reinterpret_cast<uint32_t*>(buffer.get());
    for (size_t i = 0; i < 32; ++i) {
        writer[i] = i;
    }
    webfs.EnableFileStatistics("TEST");

    auto rc = webfs.RegisterFileBuffer("TEST", WebFileSystem::DataBuffer{std::move(buffer), 32 * sizeof(uint32_t)});
    ASSERT_TRUE(rc.ok());
    auto hdl = std::move(rc.ValueUnsafe());

    std::vector<char> out;
    out.resize(32 * sizeof(uint32_t));
    webfs.Read(*hdl, out.data(), out.size(), 0);
    webfs.Read(*hdl, out.data(), out.size(), 0);
    webfs.Read(*hdl, out.data(), out.size(), 0);
    webfs.Read(*hdl, out.data(), out.size(), 0);

    auto reader = reinterpret_cast<uint32_t*>(out.data());
    for (size_t i = 0; i < 32; ++i) {
        ASSERT_EQ(reader[i], i);
    }

    auto stats_buffer = webfs.ExportFileRangeStatistics("TEST");
    ASSERT_TRUE(stats_buffer.ok()) << stats_buffer.status().message();
    ASSERT_EQ(stats_buffer.ValueUnsafe()->size(), sizeof(uint16_t));
    auto stats = reinterpret_cast<const uint16_t*>(stats_buffer.ValueUnsafe()->data());
    ASSERT_EQ(*stats, 2);  // ((1 << 2) - 1) == 3, ((1 << 3) - 1) == 7
}

}  // namespace
