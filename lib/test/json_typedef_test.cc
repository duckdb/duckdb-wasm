#include "duckdb/web/json_typedef.h"

#include <optional>

#include "duckdb/common/types.hpp"
#include "duckdb/web/json_analyzer.h"
#include "gtest/gtest.h"
#include "rapidjson/document.h"
#include "rapidjson/memorystream.h"
#include "rapidjson/reader.h"

using namespace duckdb::web::json;

namespace {

struct JSONTypedefTest {
    struct TestPrinter {
        std::string operator()(const ::testing::TestParamInfo<JSONTypedefTest>& info) const {
            return std::string{info.param.name};
        }
    };
    std::string_view name;
    std::string_view as_json;
    std::string_view as_text;
};

struct JSONTypedefTestSuite : public testing::TestWithParam<JSONTypedefTest> {};

TEST_P(JSONTypedefTestSuite, ReadFields) {
    auto& test = GetParam();

    rapidjson::Document doc;
    doc.Parse(test.as_json.data(), test.as_json.size());
    ASSERT_FALSE(doc.HasParseError()) << doc.GetParseError() << std::endl;
    ASSERT_TRUE(doc.IsObject());

    auto type_doc = ((const rapidjson::Document&)(doc)).GetObject();
    auto type = SQLToArrowType(type_doc);
    ASSERT_TRUE(type.ok()) << type.status().message();

    ASSERT_EQ(std::string{test.as_text}, std::string{type.ValueUnsafe()->ToString()});
}

// clang-format off
static std::vector<JSONTypedefTest> JSON_TYPEDEF_TESTS = {
    {
        .name = "binary",
        .as_json = R"JSON({ "type": "binary" })JSON",
        .as_text = "binary",
    },
    {
        .name = "bool",
        .as_json = R"JSON({ "type": "bool" })JSON",
        .as_text = "bool",
    },
    {
        .name = "boolean",
        .as_json = R"JSON({ "type": "boolean" })JSON",
        .as_text = "bool",
    },
    {
        .name = "date",
        .as_json = R"JSON({ "type": "date" })JSON",
        .as_text = "date64[ms]",
    },
    {
        .name = "date32",
        .as_json = R"JSON({ "type": "date32" })JSON",
        .as_text = "date32[day]",
    },
    {
        .name = "date64",
        .as_json = R"JSON({ "type": "date64" })JSON",
        .as_text = "date64[ms]",
    },
    {
        .name = "decimal128",
        .as_json = R"JSON({ "type": "decimal128", "precision": 30, "scale": 4 })JSON",
        .as_text = "decimal128(30, 4)",
    },
    {
        .name = "decimal256",
        .as_json = R"JSON({ "type": "decimal256", "precision": 40, "scale": 4 })JSON",
        .as_text = "decimal256(40, 4)",
    },
    {
        .name = "double",
        .as_json = R"JSON({ "type": "double" })JSON",
        .as_text = "double",
    },
    {
        .name = "float64",
        .as_json = R"JSON({ "type": "float64" })JSON",
        .as_text = "double",
    },
    {
        .name = "float",
        .as_json = R"JSON({ "type": "float32" })JSON",
        .as_text = "float",
    },
    {
        .name = "float32",
        .as_json = R"JSON({ "type": "float32" })JSON",
        .as_text = "float",
    },
    {
        .name = "halffloat",
        .as_json = R"JSON({ "type": "halffloat" })JSON",
        .as_text = "halffloat",
    },
    {
        .name = "float16",
        .as_json = R"JSON({ "type": "float16" })JSON",
        .as_text = "halffloat",
    },
    {
        .name = "int8",
        .as_json = R"JSON({ "type": "int8" })JSON",
        .as_text = "int8",
    },
    {
        .name = "int16",
        .as_json = R"JSON({ "type": "int16" })JSON",
        .as_text = "int16",
    },
    {
        .name = "int32",
        .as_json = R"JSON({ "type": "int32" })JSON",
        .as_text = "int32",
    },
    {
        .name = "int64",
        .as_json = R"JSON({ "type": "int64" })JSON",
        .as_text = "int64",
    },
    {
        .name = "uint8",
        .as_json = R"JSON({ "type": "uint8" })JSON",
        .as_text = "uint8",
    },
    {
        .name = "uint16",
        .as_json = R"JSON({ "type": "uint16" })JSON",
        .as_text = "uint16",
    },
    {
        .name = "uint32",
        .as_json = R"JSON({ "type": "uint32" })JSON",
        .as_text = "uint32",
    },
    {
        .name = "uint64",
        .as_json = R"JSON({ "type": "uint64" })JSON",
        .as_text = "uint64",
    },
    {
        .name = "duration",
        .as_json = R"JSON({ "type": "duration" })JSON",
        .as_text = "duration[ms]",
    },
    {
        .name = "duration_ms",
        .as_json = R"JSON({ "type": "duration[ms]" })JSON",
        .as_text = "duration[ms]",
    },
    {
        .name = "duration_ns",
        .as_json = R"JSON({ "type": "duration[ns]" })JSON",
        .as_text = "duration[ns]",
    },
    {
        .name = "duration_s",
        .as_json = R"JSON({ "type": "duration[s]" })JSON",
        .as_text = "duration[s]",
    },
    {
        .name = "duration_us",
        .as_json = R"JSON({ "type": "duration[us]" })JSON",
        .as_text = "duration[us]",
    },
    {
        .name = "fixedsizebinary",
        .as_json = R"JSON({ "type": "fixedsizebinary", "byteWidth": 200 })JSON",
        .as_text = "fixed_size_binary[200]",
    },
    {
        .name = "fixedsizelist",
        .as_json = R"JSON({ "type": "fixedsizelist", "listSize": 200, "children": [{"name": "bar", "type": "int32"}] })JSON",
        .as_text = "fixed_size_list<bar: int32>[200]",
    },
    {
        .name = "interval_dt",
        .as_json = R"JSON({ "type": "interval[dt]"})JSON",
        .as_text = "day_time_interval",
    },
    {
        .name = "interval_dt_explicit",
        .as_json = R"JSON({ "type": "daytimeinterval"})JSON",
        .as_text = "day_time_interval",
    },
    {
        .name = "interval_m",
        .as_json = R"JSON({ "type": "interval[m]"})JSON",
        .as_text = "month_interval",
    },
    {
        .name = "interval_m_explicit",
        .as_json = R"JSON({ "type": "monthinterval"})JSON",
        .as_text = "month_interval",
    },
    {
        .name = "null",
        .as_json = R"JSON({ "type": "null"})JSON",
        .as_text = "null",
    },
    {
        .name = "utf8",
        .as_json = R"JSON({ "type": "utf8"})JSON",
        .as_text = "string",
    },
    {
        .name = "string",
        .as_json = R"JSON({ "type": "string"})JSON",
        .as_text = "string",
    },
    {
        .name = "time_ms",
        .as_json = R"JSON({ "type": "time[ms]"})JSON",
        .as_text = "time32[ms]",
    },
    {
        .name = "time_ns",
        .as_json = R"JSON({ "type": "time[ns]"})JSON",
        .as_text = "time64[ns]",
    },
    {
        .name = "time_us",
        .as_json = R"JSON({ "type": "time[us]"})JSON",
        .as_text = "time64[us]",
    },
    {
        .name = "time_s",
        .as_json = R"JSON({ "type": "time[s]"})JSON",
        .as_text = "time32[s]",
    },
    {
        .name = "time32_ms",
        .as_json = R"JSON({ "type": "time32[ms]"})JSON",
        .as_text = "time32[ms]",
    },
    {
        .name = "time32_s",
        .as_json = R"JSON({ "type": "time32[s]"})JSON",
        .as_text = "time32[s]",
    },
    {
        .name = "time64_ns",
        .as_json = R"JSON({ "type": "time64[ns]"})JSON",
        .as_text = "time64[ns]",
    },
    {
        .name = "time64_us",
        .as_json = R"JSON({ "type": "time64[us]"})JSON",
        .as_text = "time64[us]",
    },
    {
        .name = "timestamp_default",
        .as_json = R"JSON({ "type": "timestamp"})JSON",
        .as_text = "timestamp[s]",
    },
    {
        .name = "timestamp_s",
        .as_json = R"JSON({ "type": "timestamp[s]"})JSON",
        .as_text = "timestamp[s]",
    },
    {
        .name = "timestamp_ms",
        .as_json = R"JSON({ "type": "timestamp[ms]"})JSON",
        .as_text = "timestamp[ms]",
    },
    {
        .name = "timestamp_ns",
        .as_json = R"JSON({ "type": "timestamp[ns]"})JSON",
        .as_text = "timestamp[ns]",
    },
    {
        .name = "timestamp_us",
        .as_json = R"JSON({ "type": "timestamp[us]"})JSON",
        .as_text = "timestamp[us]",
    },
    {
        .name = "timestamp_s_timezone",
        .as_json = R"JSON({ "type": "timestamp[s]", "timezone": "utc"})JSON",
        .as_text = "timestamp[s, tz=utc]",
    },
    {
        .name = "list",
        .as_json = R"JSON({ "type": "list", "children": [{"name": "bar", "type": "int32"}] })JSON",
        .as_text = "list<bar: int32>",
    },
    {
        .name = "struct_simple",
        .as_json = R"JSON({ "type": "struct", "children": [{"name": "bar", "type": "int32"}] })JSON",
        .as_text = "struct<bar: int32>",
    },
    {
        .name = "struct_map",
        .as_json = R"JSON({
            "type": "map",
            "children": [
                {
                    "name": "bar",
                    "type": "struct",
                    "nullable": false,
                    "children": [
                        {
                            "name": "key",
                            "type": "int32",
                            "nullable": false
                        },
                        {
                            "name": "value",
                            "type": "int32"
                        }
                    ]
                }
            ]
        })JSON",
        .as_text = "map<int32, int32 ('bar')>",
    },
};
// clang-format on

INSTANTIATE_TEST_SUITE_P(JSONTypedefTest, JSONTypedefTestSuite, testing::ValuesIn(JSON_TYPEDEF_TESTS),
                         JSONTypedefTest::TestPrinter());

// struct JSONTypedefWriterTest {
//     struct TestPrinter {
//         std::string operator()(const ::testing::TestParamInfo<JSONTypedefTest>& info) const {
//             return std::string{info.param.name};
//         }
//     };
//     std::string_view name;
//     duckdb::LogicalType input;
//     std::string_view expected;
// };
//
// struct JSONTypedefWriterTestSuite : public testing::TestWithParam<JSONTypedefWriterTest> {};
//
// TEST_P(JSONTypedefWriterTestSuite, WriteType) {
//     auto& test = GetParam();
//
//     rapidjson::Document doc;
//     auto root = duckdb::web::json::WriteSQLType(doc, test.input);
//     ASSERT_EQ(root.)
//     doc.Set(root.ValueUnsafe());
//
//     doc.Parse(test.input, test.input.size());
//     ASSERT_FALSE(doc.HasParseError()) << doc.GetParseError() << std::endl;
//     ASSERT_TRUE(doc.IsArray());
//
//     auto array = ((const rapidjson::Document&)(doc)).GetArray();
//     auto fields = SQLToArrowFields(array);
//     ASSERT_TRUE(fields.ok()) << fields.status().message();
//
//     auto have = arrow::struct_(std::move(fields.ValueUnsafe()));
//     ASSERT_EQ(std::string{test.expected}, std::string{have->ToString()});
// }
}  // namespace
