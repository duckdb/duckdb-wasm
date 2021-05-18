#include "duckdb/web/json_analyzer.h"

#include "gtest/gtest.h"
#include "rapidjson/document.h"
#include "rapidjson/memorystream.h"
#include "rapidjson/reader.h"

using namespace duckdb::web::json;

namespace {

struct membuf : std::streambuf {
    membuf(std::string_view data) {
        char* p(const_cast<char*>(data.data()));
        this->setg(p, p, p + data.size());
    }
};

struct imemstream : virtual membuf, std::istream {
    imemstream(std::string_view data) : membuf(data), std::istream(static_cast<std::streambuf*>(this)) {}
};

struct JSONAnalyzerTest {
    struct TestPrinter {
        std::string operator()(const ::testing::TestParamInfo<JSONAnalyzerTest>& info) const {
            return std::string{info.param.name};
        }
    };
    std::string_view name;
    std::string_view input;
    TableShape shape;
    std::string_view type;
    std::vector<std::pair<std::string_view, std::string_view>> columns = {};
};

struct JSONAnalyzerTestSuite : public testing::TestWithParam<JSONAnalyzerTest> {};

TEST_P(JSONAnalyzerTestSuite, InferTableType) {
    auto& test = GetParam();

    imemstream in{test.input};
    TableType table;
    auto status = InferTableType(in, table);
    ASSERT_TRUE(status.ok()) << status.message();

    ASSERT_EQ(table.shape, test.shape);
    if (table.shape == TableShape::UNRECOGNIZED) {
        ASSERT_EQ(test.type, nullptr);
        return;
    }
    ASSERT_NE(table.type, nullptr);
    ASSERT_EQ(std::string{table.type->ToString()}, std::string{test.type});

    if (!test.columns.empty()) {
        for (auto& [name, column] : test.columns) {
            std::string name_buffer{name};
            ASSERT_TRUE(table.column_boundaries.count(name_buffer)) << name;
            auto range = table.column_boundaries.at(name_buffer);
            auto range_str = test.input.substr(range.offset, range.size);
            ASSERT_EQ(std::string{column}, std::string{range_str});
        }
    }
}

// clang-format off
static std::vector<JSONAnalyzerTest> JSON_ANALYZER_TESTS = {

    // ---------------------------------------
    // Column-major table layout
    {
        .name = "cols_empty",
        .input = R"JSON({})JSON",
        .shape = TableShape::COLUMN_OBJECT,
        .type = "struct<>",
    },
    {
        .name = "cols_empty_col",
        .input = R"JSON({
            "a": []
        })JSON",
        .shape = TableShape::COLUMN_OBJECT,
        .type = "struct<a: null>",
        .columns = {
            {"a", "[]"}
        }
    },
    {
        .name = "cols_single_bool",
        .input = R"JSON({
            "a": [true, true, false]
        })JSON",
        .shape = TableShape::COLUMN_OBJECT,
        .type = "struct<a: bool>",
        .columns = {
            {"a", "[true, true, false]"}
        }
    },
    {
        .name = "cols_single_i32",
        .input = R"JSON({
            "a": [1, 2, 3]
        })JSON",
        .shape = TableShape::COLUMN_OBJECT,
        .type = "struct<a: int32>",
        .columns = {
            {"a", "[1, 2, 3]"}
        }
    },
    {
        .name = "cols_single_u32",
        .input = R"JSON({
            "a": [1, 2, 2147483648]
        })JSON",
        .shape = TableShape::COLUMN_OBJECT,
        .type = "struct<a: uint32>",
        .columns = {
            {"a", "[1, 2, 2147483648]"}
        }
    },
    {
        .name = "cols_i32_sign_conflict",
        .input = R"JSON({
            "a": [1, -2, 2147483648]
        })JSON",
        .shape = TableShape::COLUMN_OBJECT,
        .type = "struct<a: int64>",
        .columns = {
            {"a", "[1, -2, 2147483648]"}
        }
    },
    {
        .name = "cols_u64",
        .input = R"JSON({
            "a": [1, 2, 9223372036854775808]
        })JSON",
        .shape = TableShape::COLUMN_OBJECT,
        .type = "struct<a: uint64>",
        .columns = {
            {"a", "[1, 2, 9223372036854775808]"}
        }
    },
    {
        .name = "cols_u64_sign_conflict",
        .input = R"JSON({
            "a": [-1, 2, 9223372036854775808]
        })JSON",
        .shape = TableShape::COLUMN_OBJECT,
        .type = "struct<a: double>",
        .columns = {
            {"a", "[-1, 2, 9223372036854775808]"}
        }
    },
    {
        .name = "cols_f64",
        .input = R"JSON({
            "a": [1.0, 2.0, 3.0]
        })JSON",
        .shape = TableShape::COLUMN_OBJECT,
        .type = "struct<a: double>",
        .columns = {
            {"a", "[1.0, 2.0, 3.0]"}
        }
    },
    {
        .name = "cols_f64_mixed_1",
        .input = R"JSON({
            "a": [1, -2, 3.0, true]
        })JSON",
        .shape = TableShape::COLUMN_OBJECT,
        .type = "struct<a: double>",
        .columns = {
            {"a", "[1, -2, 3.0, true]"}
        }
    },
    {
        .name = "cols_timestamp_1",
        .input = R"JSON({
            "a": [
                "2007-08-31 16:47",
                "2007-12-24 18:21",
                "2008-02-01 09:00:22",
                "2009-01-01 12:00:00",
                "2009-06-30 18:30:00"
            ]
        })JSON",
        .shape = TableShape::COLUMN_OBJECT,
        .type = "struct<a: timestamp[s]>",
        .columns = {
            {"a", R"JSON([
                "2007-08-31 16:47",
                "2007-12-24 18:21",
                "2008-02-01 09:00:22",
                "2009-01-01 12:00:00",
                "2009-06-30 18:30:00"
            ])JSON"}
        }
    },
    {
        .name = "cols_timestamp_mixed_1",
        .input = R"JSON({
            "a": [
                1, 2,
                "2008-02-01 09:00:22",
                "2009-01-01 12:00:00",
                "2009-06-30 18:30:00"
            ]
        })JSON",
        .shape = TableShape::COLUMN_OBJECT,
        .type = "struct<a: timestamp[s]>",
        .columns = {
            {"a", R"JSON([
                1, 2,
                "2008-02-01 09:00:22",
                "2009-01-01 12:00:00",
                "2009-06-30 18:30:00"
            ])JSON"}
        }
    },
    {
        .name = "cols_2",
        .input = R"JSON({
            "a": [1, -2, 3],
            "b": ["c", "d", "e"]
        })JSON",
        .shape = TableShape::COLUMN_OBJECT,
        .type = "struct<a: int32, b: string>",
        .columns = {
            {"a", "[1, -2, 3]"},
            {"b", R"(["c", "d", "e"])"},
        }
    },
    {
        .name = "cols_3",
        .input = R"JSON({
            "a": [1, -2, 3],
            "b": ["c", "d", "e"],
            "f": [true, true, false]
        })JSON",
        .shape = TableShape::COLUMN_OBJECT,
        .type = "struct<a: int32, b: string, f: bool>",
        .columns = {
            {"a", "[1, -2, 3]"},
            {"b", R"(["c", "d", "e"])"},
            {"f", R"([true, true, false])"},
        },
    },

    // ---------------------------------------
    // Row-major table layout
    {
        .name = "rows_empty",
        .input = R"JSON([])JSON",
        .shape = TableShape::ROW_ARRAY,
        .type = "struct<>"
    },
    {
        .name = "rows_single_bool",
        .input = R"JSON([
            { "a": true },
            { "a": true },
            { "a": false }
        ])JSON",
        .shape = TableShape::ROW_ARRAY,
        .type = "struct<a: bool>"
    },
    {
        .name = "rows_single_i32",
        .input = R"JSON([
            { "a": 1 },
            { "a": 2 },
            { "a": 3 }
        ])JSON",
        .shape = TableShape::ROW_ARRAY,
        .type = "struct<a: int32>"
    },
    {
        .name = "rows_single_u32",
        .input = R"JSON([
            { "a": 1 },
            { "a": 2 },
            { "a": 2147483648 }
        ])JSON",
        .shape = TableShape::ROW_ARRAY,
        .type = "struct<a: uint32>"
    },
    {
        .name = "rows_i32_sign_conflict",
        .input = R"JSON([
            { "a": 1 },
            { "a": -2 },
            { "a": 2147483648 }
        ])JSON",
        .shape = TableShape::ROW_ARRAY,
        .type = "struct<a: uint64>"
    },
    {
        .name = "rows_u64",
        .input = R"JSON([
            { "a": 1 },
            { "a": 2 },
            { "a": 9223372036854775808 }
        ])JSON",
        .shape = TableShape::ROW_ARRAY,
        .type = "struct<a: uint64>"
    },
    {
        .name = "rows_u64_sign_conflict",
        .input = R"JSON([
            { "a": 1 },
            { "a": -2 },
            { "a": 9223372036854775808 }
        ])JSON",
        .shape = TableShape::ROW_ARRAY,
        .type = "struct<a: double>"
    },
    {
        .name = "rows_f64",
        .input = R"JSON([
            { "a": 1.0 },
            { "a": 2.0 },
            { "a": 3.0 }
        ])JSON",
        .shape = TableShape::ROW_ARRAY,
        .type = "struct<a: double>"
    },
    {
        .name = "rows_f64_mixed_1",
        .input = R"JSON([
            { "a": 1 },
            { "a": -2 },
            { "a": 3.0 },
            { "a": true }
        ])JSON",
        .shape = TableShape::ROW_ARRAY,
        .type = "struct<a: double>"
    },
    {
        .name = "rows_timestamp_1",
        .input = R"JSON([
            { "a": "2007-08-31 16:47" },
            { "a": "2007-12-24 18:21" },
            { "a": "2008-02-01 09:00:22" },
            { "a": "2009-01-01 12:00:00" },
            { "a": "2009-06-30 18:30:00" }
        ])JSON",
        .shape = TableShape::ROW_ARRAY,
        .type = "struct<a: timestamp[s]>"
    },
    {
        .name = "rows_timestamp_mixed_1",
        .input = R"JSON([
            { "a": 1 },
            { "a": 2 },
            { "a": "2008-02-01 09:00:22" },
            { "a": "2009-01-01 12:00:00" },
            { "a": "2009-06-30 18:30:00" }
        ])JSON",
        .shape = TableShape::ROW_ARRAY,
        .type = "struct<a: timestamp[s]>"
    },
    {
        .name = "rows_2",
        .input = R"JSON([
            { "a": 1, "b": "c" },
            { "a": -2, "b": "d" },
            { "a": 3, "b": "e" }
        ])JSON",
        .shape = TableShape::ROW_ARRAY,
        .type = "struct<a: int32, b: string>"
    },
    {
        .name = "rows_3",
        .input = R"JSON([
            { "a": 1, "b": "c", "f": true },
            { "a": -2, "b": "d", "f": true },
            { "a": 3, "b": "e", "f": false }
        ])JSON",
        .shape = TableShape::ROW_ARRAY,
        .type = "struct<a: int32, b: string, f: bool>"
    },
};
// clang-format on

INSTANTIATE_TEST_SUITE_P(JSONAnalyzerTest, JSONAnalyzerTestSuite, testing::ValuesIn(JSON_ANALYZER_TESTS),
                         JSONAnalyzerTest::TestPrinter());

}  // namespace
