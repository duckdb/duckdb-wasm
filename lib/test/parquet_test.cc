#include <filesystem>
#include <sstream>

#include "duckdb/common/types/date.hpp"
#include "duckdb/common/types/timestamp.hpp"
#include "duckdb/web/extensions/parquet_extension.h"
#include "duckdb/web/io/ifstream.h"
#include "duckdb/web/io/memory_filesystem.h"
#include "duckdb/web/test/config.h"
#include "duckdb/web/webdb.h"
#include "gtest/gtest.h"

using namespace duckdb::web;
using namespace duckdb::web::test;
using namespace std;
namespace fs = std::filesystem;

namespace {

TEST(ParquetLoadTest, LoadParquet) {
    auto db = make_shared<WebDB>(NATIVE);
    WebDB::Connection conn{*db};
    std::stringstream ss;
    auto data = test::SOURCE_DIR / ".." / "data" / "uni" / "studenten.parquet";
    ss << "SELECT * FROM parquet_scan('" << data.string() << "');";
    auto result = conn.connection().Query(ss.str());
    ASSERT_TRUE(CHECK_COLUMN(*result, 0, {24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555}));
    ASSERT_TRUE(CHECK_COLUMN(
        *result, 1,
        {"Xenokrates", "Jonas", "Fichte", "Aristoxenos", "Schopenhauer", "Carnap", "Theophrastos", "Feuerbach"}));
    ASSERT_TRUE(CHECK_COLUMN(*result, 2, {18, 12, 10, 8, 6, 3, 2, 2}));
}

TEST(ParquetLoadTest, LoadParquetTwice) {
    auto db = make_shared<WebDB>(NATIVE);
    WebDB::Connection conn{*db};
    std::stringstream ss;
    auto data = test::SOURCE_DIR / ".." / "data" / "uni" / "studenten.parquet";
    ss << "SELECT * FROM parquet_scan('" << data.string() << "');";
    auto query = ss.str();
    auto result = conn.connection().Query(query);
    ASSERT_TRUE(CHECK_COLUMN(*result, 0, {24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555}));
    ASSERT_TRUE(CHECK_COLUMN(
        *result, 1,
        {"Xenokrates", "Jonas", "Fichte", "Aristoxenos", "Schopenhauer", "Carnap", "Theophrastos", "Feuerbach"}));
    ASSERT_TRUE(CHECK_COLUMN(*result, 2, {18, 12, 10, 8, 6, 3, 2, 2}));

    result = conn.connection().Query(query);
    ASSERT_TRUE(CHECK_COLUMN(*result, 0, {24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555}));
    ASSERT_TRUE(CHECK_COLUMN(
        *result, 1,
        {"Xenokrates", "Jonas", "Fichte", "Aristoxenos", "Schopenhauer", "Carnap", "Theophrastos", "Feuerbach"}));
    ASSERT_TRUE(CHECK_COLUMN(*result, 2, {18, 12, 10, 8, 6, 3, 2, 2}));
}

TEST(FileSystemBufferTest, FlushFrameMemoryBugRegression) {
    auto db = make_shared<WebDB>(NATIVE);
    WebDB::Connection conn{*db};
    std::string files[] = {"customer", "lineitem", "nation", "orders", "partsupp", "part", "region", "supplier"};
    for (const auto& f : files) {
        std::stringstream ss;
        auto data = test::SOURCE_DIR / ".." / "data" / "tpch" / "0_01" / "parquet" / (f + ".parquet");
        if (!fs::exists(data)) GTEST_SKIP_(": Missing SF 0.01 TPCH files");

        ss << "SELECT * FROM parquet_scan('" << data.string() << "')";
        auto stream = conn.connection().SendQuery(ss.str());
        for (auto chunk = stream->Fetch(); !!chunk && chunk->size(); chunk = stream->Fetch())
            ;
    }
}

}  // namespace
