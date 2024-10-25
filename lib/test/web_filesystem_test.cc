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

namespace duckdb {
namespace web {
namespace test {

bool CHECK_COLUMN(MaterializedQueryResult& result, uint32_t column, vector<Value> values) {
    if (result.HasError()) {
        printf("CHECK_COLUMN: query failed with error %s\n", result.GetError().c_str());
    }
    if (values.size() != result.RowCount()) {
        printf("CHECK_COLUMN: Difference in result row count\n");
        return false;
    }
    if (column >= result.ColumnCount()) {
        printf("CHECK_COLUMN: Column count out of range\n");
    }
    for (uint32_t row_idx = 0; row_idx < values.size(); row_idx++) {
        auto actual_val = result.GetValue(column, row_idx);
        if (!Value::DefaultValuesAreEqual(values[row_idx], actual_val)) {
            auto expected_str = values[row_idx].ToString();
            auto actual_str = actual_val.ToString();
            printf(
                "CHECK_COLUMN: Difference between expected value \"%s\" and actual value \"%s\" at position col:%d, "
                "row:%d\n",
                expected_str.c_str(), actual_str.c_str(), int(column), int(row_idx));
            return false;
        }
    }
    return true;
}

}  // namespace test
}  // namespace web
}  // namespace duckdb

namespace {

TEST(WebFileSystemTest, LoadParquet) {
    auto db = std::make_shared<WebDB>(WEB);
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

TEST(WebFileSystemTest, TestTPCHScans) {
    auto db = std::make_shared<WebDB>(WEB);
    WebDB::Connection conn{*db};
    std::string files[] = {"customer", "lineitem", "nation", "orders", "partsupp", "part", "region", "supplier"};
    for (const auto& f : files) {
        std::stringstream ss;
        auto data = test::SOURCE_DIR / ".." / "data" / "tpch" / "0_01" / "parquet" / (f + ".parquet");
        if (!fs::exists(data)) GTEST_SKIP_(": Missing SF 0.01 TPCH files");

        ss << "SELECT * FROM parquet_scan('" << data.string() << "')";
        auto stream = conn.connection().SendQuery(ss.str());
        ASSERT_TRUE(!stream->HasError()) << stream->GetError();
        for (auto chunk = stream->Fetch(); !!chunk && chunk->size(); chunk = stream->Fetch())
            ;
    }
}

TEST(WebFileSystemTest, TestExport) {
    auto db = std::make_shared<WebDB>(WEB);
    WebDB::Connection conn{*db};
    auto result = conn.RunQuery("CREATE TABLE foo AS (SELECT * FROM generate_series(1, 100) t(v))");
    ASSERT_TRUE(result.ok()) << result.status().message();
    result = conn.RunQuery("EXPORT DATABASE '/tmp/duckdbexport'");
    ASSERT_TRUE(result.ok()) << result.status().message();
}

}  // namespace
