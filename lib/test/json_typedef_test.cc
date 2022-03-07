#include "duckdb/web/json_typedef.h"

#include <optional>

#include "duckdb/common/types.hpp"
#include "duckdb/web/json_analyzer.h"
#include "gtest/gtest.h"
#include "rapidjson/document.h"
#include "rapidjson/memorystream.h"
#include "rapidjson/reader.h"
#include "rapidjson/writer.h"

using namespace duckdb::web::json;

namespace {

struct JSONTypedefTest {
    struct TestPrinter {
        std::string operator()(const ::testing::TestParamInfo<JSONTypedefTest>& info) const {
            return std::string{info.param.name};
        }
    };
    std::string_view name;
    duckdb::LogicalType logical;
    std::string_view as_json;
    std::string_view as_arrow;
};

struct JSONTypedefTestSuite : public testing::TestWithParam<JSONTypedefTest> {};

TEST_P(JSONTypedefTestSuite, Reading) {
    auto& test = GetParam();

    rapidjson::Document doc;
    doc.Parse(test.as_json.data(), test.as_json.size());
    ASSERT_FALSE(doc.HasParseError()) << doc.GetParseError() << std::endl;
    ASSERT_TRUE(doc.IsObject());

    auto type_doc = ((const rapidjson::Document&)(doc)).GetObject();
    auto type = SQLToArrowType(type_doc);
    ASSERT_TRUE(type.ok()) << type.status().message();

    ASSERT_EQ(std::string{test.as_arrow}, std::string{type.ValueUnsafe()->ToString()});
}

TEST_P(JSONTypedefTestSuite, Writing) {
    auto& test = GetParam();

    rapidjson::Document doc;
    auto root = duckdb::web::json::WriteSQLType(doc, test.logical);
    ASSERT_TRUE(root.ok());
    ASSERT_TRUE(root.ValueUnsafe().IsObject());
    doc.SetObject().Swap(root.ValueUnsafe());

    rapidjson::StringBuffer strbuf;
    rapidjson::Writer<rapidjson::StringBuffer> writer{strbuf};
    doc.Accept(writer);
    auto have = strbuf.GetString();

    ASSERT_EQ(std::string{test.as_json}, have);
}

// clang-format off
static std::vector<JSONTypedefTest> JSON_TYPEDEF_TESTS = {
//    {
//        .name = "binary",
//        .as_json = R"JSON({ "logical": "binary" })JSON",
//        .as_text = "binary",
//    },
    {
        .name = "bool",
        .logical = duckdb::LogicalType::BOOLEAN,
        .as_json = R"JSON({"logicalType":"bool"})JSON",
        .as_arrow = "bool",
    },
    {
        .name = "date",
        .logical = duckdb::LogicalType::DATE,
        .as_json = R"JSON({"logicalType":"date32[d]"})JSON",
        .as_arrow = "date32[day]",
    },
//    {
//        .name = "decimal128",
//        .logical = duckdb::LogicalType::DECIMAL(30, 4),
//        .as_json = R"JSON({"logical":"decimal128","precision":30,"scale":4})JSON",
//        .as_arrow = "decimal128(30,4)",
//    },
//    {
//        .name = "decimal256",
//        .logical = duckdb::LogicalType::DECIMAL(40, 4),
//        .as_json = R"JSON({"logical":"decimal256","precision":40,"scale":4})JSON",
//        .as_arrow = "decimal256(40,4)",
//    },
    {
        .name = "double",
        .logical = duckdb::LogicalType::DOUBLE,
        .as_json = R"JSON({"logicalType":"double"})JSON",
        .as_arrow = "double",
    },
    {
        .name = "float",
        .logical = duckdb::LogicalType::FLOAT,
        .as_json = R"JSON({"logicalType":"float"})JSON",
        .as_arrow = "float",
    },
//    {
//        .name = "duration",
//        .as_json = R"JSON({ "logical": "duration" })JSON",
//        .as_text = "duration[ms]",
//    },
//    {
//        .name = "duration_ms",
//        .as_json = R"JSON({ "logical": "duration[ms]" })JSON",
//        .as_text = "duration[ms]",
//    },
//    {
//        .name = "duration_ns",
//        .as_json = R"JSON({ "logical": "duration[ns]" })JSON",
//        .as_text = "duration[ns]",
//    },
//    {
//        .name = "duration_s",
//        .as_json = R"JSON({ "logical": "duration[s]" })JSON",
//        .as_text = "duration[s]",
//    },
//    {
//        .name = "duration_us",
//        .as_json = R"JSON({ "logical": "duration[us]" })JSON",
//        .as_text = "duration[us]",
//    },
//    {
//        .name = "fixedsizebinary",
//        .as_json = R"JSON({ "logical": "fixedsizebinary", "byteWidth": 200 })JSON",
//        .as_text = "fixed_size_binary[200]",
//    },
//    {
//        .name = "fixedsizelist",
//        .as_json = R"JSON({ "logical": "fixedsizelist", "listSize": 200, "children": [{"name": "bar", "logical": "int32"}] })JSON",
//        .as_text = "fixed_size_list<bar: int32>[200]",
//    },
//    {
//        .name = "interval_dt",
//        .as_json = R"JSON({ "logical": "interval[dt]"})JSON",
//        .as_text = "day_time_interval",
//    },
//    {
//        .name = "interval_dt_explicit",
//        .as_json = R"JSON({ "logical": "daytimeinterval"})JSON",
//        .as_text = "day_time_interval",
//    },
//    {
//        .name = "interval_m",
//        .as_json = R"JSON({ "logical": "interval[m]"})JSON",
//        .as_text = "month_interval",
//    },
//    {
//        .name = "interval_m_explicit",
//        .as_json = R"JSON({ "logical": "monthinterval"})JSON",
//        .as_text = "month_interval",
//    },
//    {
//        .name = "null",
//        .as_json = R"JSON({ "logical": "null"})JSON",
//        .as_text = "null",
//    },
//    {
//        .name = "utf8",
//        .as_json = R"JSON({ "logical": "utf8"})JSON",
//        .as_text = "string",
//    },
//    {
//        .name = "string",
//        .as_json = R"JSON({ "logical": "string"})JSON",
//        .as_text = "string",
//    },
//    {
//        .name = "time_ms",
//        .as_json = R"JSON({ "logical": "time[ms]"})JSON",
//        .as_text = "time32[ms]",
//    },
//    {
//        .name = "time_ns",
//        .as_json = R"JSON({ "logical": "time[ns]"})JSON",
//        .as_text = "time64[ns]",
//    },
//    {
//        .name = "time_us",
//        .as_json = R"JSON({ "logical": "time[us]"})JSON",
//        .as_text = "time64[us]",
//    },
//    {
//        .name = "time_s",
//        .as_json = R"JSON({ "logical": "time[s]"})JSON",
//        .as_text = "time32[s]",
//    },
//    {
//        .name = "time32_ms",
//        .as_json = R"JSON({ "logical": "time32[ms]"})JSON",
//        .as_text = "time32[ms]",
//    },
//    {
//        .name = "time32_s",
//        .as_json = R"JSON({ "logical": "time32[s]"})JSON",
//        .as_text = "time32[s]",
//    },
//    {
//        .name = "time64_ns",
//        .as_json = R"JSON({ "logical": "time64[ns]"})JSON",
//        .as_text = "time64[ns]",
//    },
//    {
//        .name = "time64_us",
//        .as_json = R"JSON({ "logical": "time64[us]"})JSON",
//        .as_text = "time64[us]",
//    },
    {
        .name = "timestamp_default",
        .logical = duckdb::LogicalType::TIMESTAMP,
        .as_json = R"JSON({"logicalType":"timestamp"})JSON",
        .as_arrow = "timestamp[s]",
    },
    {
        .name = "timestamp_s",
        .logical = duckdb::LogicalType::TIMESTAMP_S,
        .as_json = R"JSON({"logicalType":"timestamp[s]"})JSON",
        .as_arrow = "timestamp[s]",
    },
    {
        .name = "timestamp_ms",
        .logical = duckdb::LogicalType::TIMESTAMP_MS,
        .as_json = R"JSON({"logicalType":"timestamp[ms]"})JSON",
        .as_arrow = "timestamp[ms]",
    },
    {
        .name = "timestamp_ns",
        .logical = duckdb::LogicalType::TIMESTAMP_NS,
        .as_json = R"JSON({"logicalType":"timestamp[ns]"})JSON",
        .as_arrow = "timestamp[ns]",
    },
    {
        .name = "list",
        .logical = duckdb::LogicalType::LIST(duckdb::LogicalType::INTEGER),
        .as_json = R"JSON({"logicalType":"list","valueType":{"logicalType":"int32"}})JSON",
        .as_arrow = "list<value: int32>",
    },
    {
        .name = "struct_simple",
        .logical = duckdb::LogicalType::STRUCT({
            {"bar", duckdb::LogicalType::INTEGER}
        }),
        .as_json = R"JSON({"logicalType":"struct","fields":[{"logicalType":"int32","name":"bar"}]})JSON",
        .as_arrow = "struct<bar: int32>",
    },
    {
        .name = "struct_map",
        .logical = duckdb::LogicalType::MAP({
            {"key", duckdb::LogicalType::INTEGER},
            {"vaue", duckdb::LogicalType::INTEGER}
        }),
        .as_json = R"JSON({"logicalType":"map","keyType":{"logicalType":"int32"},"valueType":{"logicalType":"int32"}})JSON",
        .as_arrow = "map<int32, int32 ('entry')>",
    },
};
// clang-format on

INSTANTIATE_TEST_SUITE_P(JSONTypedefTest, JSONTypedefTestSuite, testing::ValuesIn(JSON_TYPEDEF_TESTS),
                         JSONTypedefTest::TestPrinter());

}  // namespace
