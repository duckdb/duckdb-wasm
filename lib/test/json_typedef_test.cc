#include "duckdb/web/json_typedef.h"

#include <optional>

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
    std::string_view input;
    std::string_view expected;
};

struct JSONTypedefTestSuite : public testing::TestWithParam<JSONTypedefTest> {};

TEST_P(JSONTypedefTestSuite, ReadFields) {
    auto& test = GetParam();

    rapidjson::Document doc;
    doc.Parse(test.input.data(), test.input.size());
    ASSERT_FALSE(doc.HasParseError()) << doc.GetParseError() << std::endl;
    ASSERT_TRUE(doc.IsArray());

    auto array = ((const rapidjson::Document&)(doc)).GetArray();
    auto fields = ReadFields(array);
    ASSERT_TRUE(fields.ok()) << fields.status().message();

    auto have = arrow::struct_(std::move(fields.ValueUnsafe()));
    ASSERT_EQ(std::string{test.expected}, std::string{have->ToString()});
}

// clang-format off
static std::vector<JSONTypedefTest> JSON_TYPEDEF_TESTS = {
    {
        .name = "binary",
        .input = R"JSON([{ "name": "foo", "type": "binary" }])JSON",
        .expected = "struct<foo: binary>",
    },
    {
        .name = "bool",
        .input = R"JSON([{ "name": "foo", "type": "bool" }])JSON",
        .expected = "struct<foo: bool>",
    },
    {
        .name = "boolean",
        .input = R"JSON([{ "name": "foo", "type": "boolean" }])JSON",
        .expected = "struct<foo: bool>",
    },
    {
        .name = "date",
        .input = R"JSON([{ "name": "foo", "type": "date" }])JSON",
        .expected = "struct<foo: date64[ms]>",
    },
    {
        .name = "date32",
        .input = R"JSON([{ "name": "foo", "type": "date32" }])JSON",
        .expected = "struct<foo: date32[day]>",
    },
    {
        .name = "date64",
        .input = R"JSON([{ "name": "foo", "type": "date64" }])JSON",
        .expected = "struct<foo: date64[ms]>",
    },
    {
        .name = "decimal128",
        .input = R"JSON([{ "name": "foo", "type": "decimal128", "precision": 30, "scale": 4 }])JSON",
        .expected = "struct<foo: decimal128(30, 4)>",
    },
    {
        .name = "decimal256",
        .input = R"JSON([{ "name": "foo", "type": "decimal256", "precision": 40, "scale": 4 }])JSON",
        .expected = "struct<foo: decimal256(40, 4)>",
    },
    {
        .name = "double",
        .input = R"JSON([{ "name": "foo", "type": "double" }])JSON",
        .expected = "struct<foo: double>",
    },
    {
        .name = "float64",
        .input = R"JSON([{ "name": "foo", "type": "float64" }])JSON",
        .expected = "struct<foo: double>",
    },
    {
        .name = "float",
        .input = R"JSON([{ "name": "foo", "type": "float32" }])JSON",
        .expected = "struct<foo: float>",
    },
    {
        .name = "float32",
        .input = R"JSON([{ "name": "foo", "type": "float32" }])JSON",
        .expected = "struct<foo: float>",
    },
    {
        .name = "halffloat",
        .input = R"JSON([{ "name": "foo", "type": "halffloat" }])JSON",
        .expected = "struct<foo: halffloat>",
    },
    {
        .name = "float16",
        .input = R"JSON([{ "name": "foo", "type": "float16" }])JSON",
        .expected = "struct<foo: halffloat>",
    },
    {
        .name = "int8",
        .input = R"JSON([{ "name": "foo", "type": "int8" }])JSON",
        .expected = "struct<foo: int8>",
    },
    {
        .name = "int16",
        .input = R"JSON([{ "name": "foo", "type": "int16" }])JSON",
        .expected = "struct<foo: int16>",
    },
    {
        .name = "int32",
        .input = R"JSON([{ "name": "foo", "type": "int32" }])JSON",
        .expected = "struct<foo: int32>",
    },
    {
        .name = "int64",
        .input = R"JSON([{ "name": "foo", "type": "int64" }])JSON",
        .expected = "struct<foo: int64>",
    },
    {
        .name = "uint8",
        .input = R"JSON([{ "name": "foo", "type": "uint8" }])JSON",
        .expected = "struct<foo: uint8>",
    },
    {
        .name = "uint16",
        .input = R"JSON([{ "name": "foo", "type": "uint16" }])JSON",
        .expected = "struct<foo: uint16>",
    },
    {
        .name = "uint32",
        .input = R"JSON([{ "name": "foo", "type": "uint32" }])JSON",
        .expected = "struct<foo: uint32>",
    },
    {
        .name = "uint64",
        .input = R"JSON([{ "name": "foo", "type": "uint64" }])JSON",
        .expected = "struct<foo: uint64>",
    },
    {
        .name = "duration",
        .input = R"JSON([{ "name": "foo", "type": "duration" }])JSON",
        .expected = "struct<foo: duration[ms]>",
    },
    {
        .name = "duration_ms",
        .input = R"JSON([{ "name": "foo", "type": "duration[ms]" }])JSON",
        .expected = "struct<foo: duration[ms]>",
    },
    {
        .name = "duration_ns",
        .input = R"JSON([{ "name": "foo", "type": "duration[ns]" }])JSON",
        .expected = "struct<foo: duration[ns]>",
    },
    {
        .name = "duration_s",
        .input = R"JSON([{ "name": "foo", "type": "duration[s]" }])JSON",
        .expected = "struct<foo: duration[s]>",
    },
    {
        .name = "duration_us",
        .input = R"JSON([{ "name": "foo", "type": "duration[us]" }])JSON",
        .expected = "struct<foo: duration[us]>",
    },
    {
        .name = "fixedsizebinary",
        .input = R"JSON([{ "name": "foo", "type": "fixedsizebinary", "byteWidth": 200 }])JSON",
        .expected = "struct<foo: fixed_size_binary[200]>",
    },
    {
        .name = "fixedsizelist",
        .input = R"JSON([{ "name": "foo", "type": "fixedsizelist", "listSize": 200, "children": [{"name": "bar", "type": "int32"}] }])JSON",
        .expected = "struct<foo: fixed_size_list<bar: int32>[200]>",
    },
    {
        .name = "interval_dt",
        .input = R"JSON([{ "name": "foo", "type": "interval[dt]"}])JSON",
        .expected = "struct<foo: day_time_interval>",
    },
    {
        .name = "interval_dt_explicit",
        .input = R"JSON([{ "name": "foo", "type": "daytimeinterval"}])JSON",
        .expected = "struct<foo: day_time_interval>",
    },
    {
        .name = "interval_m",
        .input = R"JSON([{ "name": "foo", "type": "interval[m]"}])JSON",
        .expected = "struct<foo: month_interval>",
    },
    {
        .name = "interval_m_explicit",
        .input = R"JSON([{ "name": "foo", "type": "monthinterval"}])JSON",
        .expected = "struct<foo: month_interval>",
    },
    {
        .name = "null",
        .input = R"JSON([{ "name": "foo", "type": "null"}])JSON",
        .expected = "struct<foo: null>",
    },
    {
        .name = "utf8",
        .input = R"JSON([{ "name": "foo", "type": "utf8"}])JSON",
        .expected = "struct<foo: string>",
    },
    {
        .name = "string",
        .input = R"JSON([{ "name": "foo", "type": "string"}])JSON",
        .expected = "struct<foo: string>",
    },
    {
        .name = "time_ms",
        .input = R"JSON([{ "name": "foo", "type": "time[ms]"}])JSON",
        .expected = "struct<foo: time32[ms]>",
    },
    {
        .name = "time_ns",
        .input = R"JSON([{ "name": "foo", "type": "time[ns]"}])JSON",
        .expected = "struct<foo: time64[ns]>",
    },
    {
        .name = "time_us",
        .input = R"JSON([{ "name": "foo", "type": "time[us]"}])JSON",
        .expected = "struct<foo: time64[us]>",
    },
    {
        .name = "time_s",
        .input = R"JSON([{ "name": "foo", "type": "time[s]"}])JSON",
        .expected = "struct<foo: time32[s]>",
    },
    {
        .name = "time32_ms",
        .input = R"JSON([{ "name": "foo", "type": "time32[ms]"}])JSON",
        .expected = "struct<foo: time32[ms]>",
    },
    {
        .name = "time32_s",
        .input = R"JSON([{ "name": "foo", "type": "time32[s]"}])JSON",
        .expected = "struct<foo: time32[s]>",
    },
    {
        .name = "time64_ns",
        .input = R"JSON([{ "name": "foo", "type": "time64[ns]"}])JSON",
        .expected = "struct<foo: time64[ns]>",
    },
    {
        .name = "time64_us",
        .input = R"JSON([{ "name": "foo", "type": "time64[us]"}])JSON",
        .expected = "struct<foo: time64[us]>",
    },
    {
        .name = "timestamp_default",
        .input = R"JSON([{ "name": "foo", "type": "timestamp"}])JSON",
        .expected = "struct<foo: timestamp[s]>",
    },
    {
        .name = "timestamp_s",
        .input = R"JSON([{ "name": "foo", "type": "timestamp[s]"}])JSON",
        .expected = "struct<foo: timestamp[s]>",
    },
    {
        .name = "timestamp_ms",
        .input = R"JSON([{ "name": "foo", "type": "timestamp[ms]"}])JSON",
        .expected = "struct<foo: timestamp[ms]>",
    },
    {
        .name = "timestamp_ns",
        .input = R"JSON([{ "name": "foo", "type": "timestamp[ns]"}])JSON",
        .expected = "struct<foo: timestamp[ns]>",
    },
    {
        .name = "timestamp_us",
        .input = R"JSON([{ "name": "foo", "type": "timestamp[us]"}])JSON",
        .expected = "struct<foo: timestamp[us]>",
    },
    {
        .name = "timestamp_s_timezone",
        .input = R"JSON([{ "name": "foo", "type": "timestamp[s]", "timezone": "utc"}])JSON",
        .expected = "struct<foo: timestamp[s, tz=utc]>",
    },
    {
        .name = "list",
        .input = R"JSON([{ "name": "foo", "type": "list", "children": [{"name": "bar", "type": "int32"}] }])JSON",
        .expected = "struct<foo: list<bar: int32>>",
    },
    {
        .name = "struct_simple",
        .input = R"JSON([{ "name": "foo", "type": "struct", "children": [{"name": "bar", "type": "int32"}] }])JSON",
        .expected = "struct<foo: struct<bar: int32>>",
    },
    {
        .name = "struct_map",
        .input = R"JSON([{
            "name": "foo",
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
        }])JSON",
        .expected = "struct<foo: map<int32, int32 ('bar')>>",
    },
};
// clang-format on

INSTANTIATE_TEST_SUITE_P(JSONTypedefTest, JSONTypedefTestSuite, testing::ValuesIn(JSON_TYPEDEF_TESTS),
                         JSONTypedefTest::TestPrinter());

}  // namespace
