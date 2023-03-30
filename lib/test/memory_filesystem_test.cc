#include "duckdb/web/io/memory_filesystem.h"

#include <fstream>
#include <string>
#include <string_view>
#include <vector>

#include "duckdb/common/helper.hpp"
#include "duckdb/web/io/ifstream.h"
#include "duckdb/web/test/config.h"
#include "gtest/gtest.h"

using namespace duckdb::web;
using namespace std;

using duckdb::make_uniq;

namespace {

TEST(MemoryFilesystem, json) {
    const char* path = "foo";
    constexpr std::string_view raw_input = R"([
        {"a": 1, "b": 2.0, "c": "foo", "d": false}
        {"a": 4, "b": -5.5, "c": null, "d": true}
    ])";

    std::vector<char> input_buffer{raw_input.data(), raw_input.data() + raw_input.size()};
    auto memory_filesystem = make_uniq<io::MemoryFileSystem>();
    ASSERT_TRUE(memory_filesystem->RegisterFileBuffer(path, std::move(input_buffer)).ok());

    auto file_page_buffer = std::make_shared<io::FilePageBuffer>(std::move(memory_filesystem));
    auto input = std::make_shared<io::InputFileStreamBuffer>(file_page_buffer, path);

    std::istream ifs{input.get()};
    std::string have{std::istreambuf_iterator<char>{ifs}, std::istreambuf_iterator<char>{}};
    ASSERT_EQ(have, std::string{raw_input});
}

TEST(MemoryFilesystem, integers) {
    constexpr size_t N = 10000;
    std::vector<char> input_buffer;
    input_buffer.resize(N * sizeof(uint64_t));
    for (size_t i = 0; i < N; ++i) reinterpret_cast<uint64_t*>(input_buffer.data())[i] = i;

    const char* path = "foo";
    auto fs = std::make_shared<io::MemoryFileSystem>();
    auto fs_buffer = std::make_shared<io::FilePageBuffer>(fs);
    ASSERT_TRUE(fs->RegisterFileBuffer(path, std::move(input_buffer)).ok());
    auto input = std::make_shared<io::InputFileStreamBuffer>(fs_buffer, path);

    std::istream ifs{input.get()};
    std::vector<char> have{std::istreambuf_iterator<char>{ifs}, std::istreambuf_iterator<char>{}};
    for (size_t i = 0; i < N; ++i) {
        ASSERT_EQ(reinterpret_cast<uint64_t*>(have.data())[i], i);
    }
}

}  // namespace
