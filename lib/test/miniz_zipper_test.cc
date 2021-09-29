#include "duckdb/web/miniz_zipper.h"

#include <filesystem>
#include <fstream>
#include <iostream>
#include <sstream>

#include "arrow/table.h"
#include "duckdb/common/file_system.hpp"
#include "duckdb/web/io/arrow_ifstream.h"
#include "duckdb/web/io/file_page_buffer.h"
#include "duckdb/web/io/web_filesystem.h"
#include "duckdb/web/test/config.h"
#include "gtest/gtest.h"
#include "rapidjson/document.h"

using namespace duckdb::web;
using namespace std;
namespace fs = std::filesystem;

namespace {

std::filesystem::path CreateTestFile() {
    static uint64_t NEXT_TEST_FILE = 0;
    auto cwd = fs::current_path();
    auto tmp = cwd / ".tmp";
    auto file = tmp / (std::string("test_zipper_") + std::to_string(NEXT_TEST_FILE++));
    if (!fs::is_directory(tmp) || !fs::exists(tmp)) fs::create_directory(tmp);
    if (fs::exists(file)) fs::remove(file);
    return file;
}

TEST(ZipperTest, LoadFile) {
    auto file_page_buffer = std::make_shared<io::FilePageBuffer>();
    auto path = test::SOURCE_DIR / ".." / "data" / "uni" / "all.zip";

    Zipper zipper{file_page_buffer};
    auto load_status = zipper.LoadFromFile(path.c_str());
    ASSERT_TRUE(load_status.ok()) << load_status.message() << " " << path;

    auto maybe_count = zipper.ReadEntryCount();
    ASSERT_TRUE(maybe_count.ok()) << maybe_count.status().message();
    ASSERT_EQ(maybe_count.ValueUnsafe(), 7);

    std::vector<std::string> expected_file_names = {
        "assistenten.parquet", "hoeren.parquet",      "professoren.parquet",   "pruefen.parquet",
        "studenten.parquet",   "vorlesungen.parquet", "vorraussetzen.parquet",
    };

    for (size_t i = 0; i < 7; ++i) {
        auto maybe_info = zipper.ReadEntryInfoAsJSON(i);
        ASSERT_TRUE(maybe_info.ok()) << maybe_info.status().message();

        rapidjson::Document doc;
        doc.Parse(maybe_info.ValueUnsafe().c_str());
        ASSERT_EQ(doc["fileName"].GetString(), expected_file_names[i]);
    }
}

TEST(ZipperTest, ExtractEntryToPath) {
    auto file_page_buffer = std::make_shared<io::FilePageBuffer>();
    auto all_path = test::SOURCE_DIR / ".." / "data" / "uni" / "all.zip";
    auto expected_path = test::SOURCE_DIR / ".." / "data" / "uni" / "assistenten.parquet";
    auto out_path = CreateTestFile();

    Zipper zipper{file_page_buffer};
    auto load_status = zipper.LoadFromFile(all_path.c_str());
    ASSERT_TRUE(load_status.ok()) << load_status.message() << " " << all_path;

    auto maybe_count = zipper.ReadEntryCount();
    ASSERT_TRUE(maybe_count.ok()) << maybe_count.status().message();
    ASSERT_EQ(maybe_count.ValueUnsafe(), 7);

    auto maybe_info = zipper.ReadEntryInfoAsJSON(0);
    ASSERT_TRUE(maybe_info.ok()) << maybe_info.status().message();
    rapidjson::Document entry;
    entry.Parse(maybe_info.ValueUnsafe().c_str());
    ASSERT_EQ(std::string{entry["fileName"].GetString()}, std::string{"assistenten.parquet"});

    auto written = zipper.ExtractEntryToPath(0, out_path.c_str());
    ASSERT_EQ(entry["sizeUncompressed"].GetUint(), written.ValueUnsafe());

    file_page_buffer->FlushFiles();

    std::ifstream out_ifs{out_path};
    std::ifstream expected_ifs{expected_path};
    std::vector<char> out_buffer(std::istreambuf_iterator<char>{out_ifs}, {});
    std::vector<char> expected_buffer(std::istreambuf_iterator<char>{expected_ifs}, {});
    ASSERT_EQ(out_buffer, expected_buffer);
}

TEST(ZipperTest, ExtractPathToPath) {
    auto file_page_buffer = std::make_shared<io::FilePageBuffer>();
    auto all_path = test::SOURCE_DIR / ".." / "data" / "uni" / "all.zip";
    auto expected_path = test::SOURCE_DIR / ".." / "data" / "uni" / "assistenten.parquet";
    auto out_path = CreateTestFile();

    Zipper zipper{file_page_buffer};
    auto load_status = zipper.LoadFromFile(all_path.c_str());
    ASSERT_TRUE(load_status.ok()) << load_status.message() << " " << all_path;

    std::string to_extract = "assistenten.parquet";
    auto written = zipper.ExtractPathToPath(to_extract.c_str(), out_path.c_str());
    file_page_buffer->FlushFiles();

    std::ifstream out_ifs{out_path};
    std::ifstream expected_ifs{expected_path};
    std::vector<char> out_buffer(std::istreambuf_iterator<char>{out_ifs}, {});
    std::vector<char> expected_buffer(std::istreambuf_iterator<char>{expected_ifs}, {});
    ASSERT_EQ(out_buffer, expected_buffer);
}

}  // namespace
