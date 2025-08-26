#include <filesystem>
#include <fstream>
#include <sstream>

#include "duckdb/common/types/date.hpp"
#include "duckdb/common/types/timestamp.hpp"
#include "duckdb/web/io/ifstream.h"
#include "duckdb/web/io/memory_filesystem.h"
#include "duckdb/web/test/config.h"
#include "duckdb/web/webdb.h"
#include "gtest/gtest.h"

using namespace duckdb;
using namespace duckdb::web;
using namespace duckdb::web::test;
namespace fs = std::filesystem;

namespace {

std::filesystem::path CreateTestFile() {
    static uint64_t NEXT_TEST_FILE = 0;

    auto cwd = fs::current_path();
    auto tmp = cwd / ".tmp";
    auto file = tmp / (std::string("test_csv_") + std::to_string(NEXT_TEST_FILE++));
    if (!fs::is_directory(tmp) || !fs::exists(tmp)) fs::create_directory(tmp);
    if (fs::exists(file)) fs::remove(file);
    std::ofstream output(file);
    return file;
}

struct CSVInsertTest {
    struct TestPrinter {
        std::string operator()(const ::testing::TestParamInfo<CSVInsertTest>& info) const {
            return std::string{info.param.name};
        }
    };
    std::string_view name;
    std::string_view input;
    std::string_view options;
    std::string_view query;
    vector<vector<Value>> expected_output;
};

struct CSVInsertTestSuite : public testing::TestWithParam<CSVInsertTest> {};

TEST_P(CSVInsertTestSuite, TestImport) {
    constexpr const char* path = "TEST";

    auto& test = GetParam();
    std::vector<char> input_buffer{test.input.data(), test.input.data() + test.input.size()};
    auto memory_filesystem = std::make_unique<io::MemoryFileSystem>();
    ASSERT_TRUE(memory_filesystem->RegisterFileBuffer(path, std::move(input_buffer)).ok());

    auto db = std::make_shared<WebDB>(NATIVE, std::move(memory_filesystem));
    WebDB::Connection conn{*db};
    auto maybe_ok = conn.InsertCSVFromPath(path, test.options);
    ASSERT_TRUE(maybe_ok.ok()) << maybe_ok.message();

    auto result = conn.connection().Query(std::string{test.query});
    ASSERT_TRUE(!result->HasError()) << result->GetError();
    for (idx_t col_idx = 0; col_idx < test.expected_output.size(); col_idx++) {
        ASSERT_TRUE(CHECK_COLUMN(*result, col_idx, test.expected_output[col_idx]));
    }
}

// clang-format off
static std::vector<CSVInsertTest> CSV_IMPORT_TEST = {
    {
        .name = "integers_auto_1",
        .input = R"CSV("a","b","c"
1,2,3
4,5,6
7,8,9
)CSV",
        .options = R"JSON({
            "schema": "main",
            "name": "foo"
        })JSON",
        .query = "SELECT * FROM main.foo",
        .expected_output = {
            {1, 4, 7},
            {2, 5, 8},
            {3, 6, 9}
        }
    },
    {
        .name = "integers_auto_2",
        .input = R"CSV(a,b,c
1,2,3
4,5,6
7,8,9
)CSV",
        .options = R"JSON({
            "schema": "main",
            "name": "foo"
        })JSON",
        .query = "SELECT * FROM main.foo",
        .expected_output = {
            {1, 4, 7},
            {2, 5, 8},
            {3, 6, 9}
        }
    },
    {
        .name = "options_1",
        .input = R"CSV("a","b","c"
1,2,3
4,5,6
7,8,9
)CSV",
        .options = R"JSON({
            "schema": "main",
            "name": "foo",
            "header": true,
            "columns": [
                { "name": "a", "sqlType": "int32" },
                { "name": "b", "sqlType": "int32" },
                { "name": "c", "sqlType": "int32" }
            ]
        })JSON",
        .query = "SELECT * FROM main.foo",
        .expected_output = {
            {1, 4, 7},
            {2, 5, 8},
            {3, 6, 9}
        }
    },
    {
        .name = "options_2",
        .input = R"CSV("a","b","c"
1,2,3
4,5,6
7,8,9
)CSV",
        .options = R"JSON({
            "schema": "main",
            "name": "foo",
            "detect": false,
            "header": true,
            "columns": [
                { "name": "a", "sqlType": "int32" },
                { "name": "b", "sqlType": "int16" },
                { "name": "c", "sqlType": "int64" }
            ]
        })JSON",
        .query = "SELECT * FROM main.foo",
        .expected_output = {
            {1, 4, 7},
            {2, 5, 8},
            {3, 6, 9}
        }
    },
    {
        .name = "options_3",
        .input = R"CSV(1,2,3
4,5,6
7,8,9
)CSV",
        .options = R"JSON({
            "schema": "main",
            "name": "foo",
            "detect": false,
            "header": false,
            "columns": [
                { "name": "a", "sqlType": "int32" },
                { "name": "b", "sqlType": "int16" },
                { "name": "c", "sqlType": "int64" }
            ]
        })JSON",
        .query = "SELECT * FROM main.foo",
        .expected_output = {
            {1, 4, 7},
            {2, 5, 8},
            {3, 6, 9}
        }
    },
    {
        .name = "options_4",
        .input = R"CSV(1,2,3
4,5,6
7,8,9
)CSV",
        .options = R"JSON({
            "schema": "main",
            "name": "foo",
            "detect": false,
            "header": false,
            "columns": [
                { "name": "a", "sqlType": "int32" },
                { "name": "b", "sqlType": "int16" },
                { "name": "c", "sqlType": "utf8" }
            ]
        })JSON",
        .query = "SELECT * FROM main.foo",
        .expected_output = {
            {1, 4, 7},
            {2, 5, 8},
            {3, 6, 9}
        }
    },
    {
        .name = "options_5",
        .input = R"CSV(1|2|3
4|5|6
7|8|9
)CSV",
        .options = R"JSON({
            "schema": "main",
            "name": "foo",
            "detect": false,
            "header": false,
            "delimiter": "|",
            "columns": [
                { "name": "a", "sqlType": "int32" },
                { "name": "b", "sqlType": "int16" },
                { "name": "c", "sqlType": "utf8" }
            ]
        })JSON",
        .query = "SELECT * FROM main.foo",
        .expected_output = {
            {1, 4, 7},
            {2, 5, 8},
            {3, 6, 9}
        }
    },
    {
        .name = "options_6",
        .input = R"CSV(1|2|3
4|5|'6'
7|8|9
)CSV",
        .options = R"JSON({
            "schema": "main",
            "name": "foo",
            "detect": false,
            "header": false,
            "delimiter": "|",
            "quote": "'",
            "columns": [
                { "name": "a", "sqlType": "int32" },
                { "name": "b", "sqlType": "int16" },
                { "name": "c", "sqlType": "utf8" }
            ]
        })JSON",
        .query = "SELECT * FROM main.foo",
        .expected_output = {
            {1, 4, 7},
            {2, 5, 8},
            {3, 6, 9}
        }
    },
    {
        .name = "options_7",
        .input = R"CSV(1|2|01/02/2020
4|5|01/03/2020
7|8|01/04/2020
)CSV",
        .options = R"JSON({
            "schema": "main",
            "name": "foo",
            "detect": false,
            "header": false,
            "delimiter": "|",
            "quote": "'",
            "dateFormat": "%m/%d/%Y",
            "columns": [
                { "name": "a", "sqlType": "int32" },
                { "name": "b", "sqlType": "int16" },
                { "name": "c", "sqlType": "date" }
            ]
        })JSON",
        .query = "SELECT * FROM main.foo",
        .expected_output = {
            {1, 4, 7},
            {2, 5, 8},
            {"2020-01-02", "2020-01-03", "2020-01-04"}
        }
    },
    {
        .name = "options_8",
        .input = R"CSV(1|2|20:32:45 1992-03-02
4|5|20:32:50 1992-03-02
7|8|20:32:55 1992-03-02
)CSV",
        .options = R"JSON({
            "schema": "main",
            "name": "foo",
            "detect": false,
            "header": false,
            "delimiter": "|",
            "quote": "'",
            "timestampFormat": "%H:%M:%S %Y-%m-%d",
            "columns": [
                { "name": "a", "sqlType": "int32" },
                { "name": "b", "sqlType": "int16" },
                { "name": "c", "sqlType": "timestamp" }
            ]
        })JSON",
        .query = "SELECT * FROM main.foo",
        .expected_output = {
            {1, 4, 7},
            {2, 5, 8},
            {"1992-03-02 20:32:45", "1992-03-02 20:32:50", "1992-03-02 20:32:55"}
        }
    }
};
// clang-format on

INSTANTIATE_TEST_SUITE_P(CSVInsertTest, CSVInsertTestSuite, testing::ValuesIn(CSV_IMPORT_TEST),
                         CSVInsertTest::TestPrinter());

TEST(CSVExportTest, TestExport) {
    auto path = duckdb::web::test::SOURCE_DIR / ".." / "data" / "test.csv";

    // Import csv
    auto db = std::make_shared<WebDB>(WEB);
    WebDB::Connection conn{*db};
    auto maybe_ok = conn.InsertCSVFromPath(path.c_str(), R"JSON({
        "schema": "main",
        "name": "foo"
    })JSON");
    ASSERT_TRUE(maybe_ok.ok()) << maybe_ok.message();

    // Export to file
    auto out_path = CreateTestFile();
    conn.RunQuery(std::string("COPY foo TO '") + out_path.c_str() + "'  WITH (HEADER 1, DELIMITER ';', FORMAT CSV);")
        .ok();

    // Import csv again
    maybe_ok = conn.InsertCSVFromPath(path.c_str(), R"JSON({
        "schema": "main",
        "name": "foo2"
    })JSON");
    auto result = conn.connection().Query("SELECT * FROM foo2");
    ASSERT_TRUE(CHECK_COLUMN(*result, 0, {1, 4, 7}));
    ASSERT_TRUE(CHECK_COLUMN(*result, 1, {2, 5, 8}));
    ASSERT_TRUE(CHECK_COLUMN(*result, 2, {3, 6, 9}));
}

}  // namespace
