#include "duckdb/web/json_dataview.h"

#include <rapidjson/stringbuffer.h>

#include <duckdb/common/types/data_chunk.hpp>
#include <duckdb/main/database.hpp>
#include <filesystem>
#include <initializer_list>
#include <optional>

#include "arrow/record_batch.h"
#include "duckdb/web/environment.h"
#include "duckdb/web/io/memory_filesystem.h"
#include "duckdb/web/json_analyzer.h"
#include "duckdb/web/json_insert_options.h"
#include "duckdb/web/json_parser.h"
#include "duckdb/web/test/config.h"
#include "duckdb/web/webdb.h"
#include "gtest/gtest.h"
#include "rapidjson/document.h"
#include "rapidjson/memorystream.h"
#include "rapidjson/prettywriter.h"
#include "rapidjson/reader.h"

using namespace duckdb::web;
using namespace duckdb::web::json;

namespace {

TEST(JSONDataView, Select1) {
    rapidjson::Document doc;

    duckdb::DuckDB db;
    duckdb::Connection conn{db};

    auto result = conn.SendQuery("SELECT {'foo': 42, 'bar': '43'}");
    ASSERT_FALSE(result->HasError());
    auto chunk = result->Fetch();

    additional_buffers_t buffers;
    std::vector<double> data_ptrs;
    auto view = CreateDataView(doc, *chunk, data_ptrs, buffers);
    ASSERT_TRUE(view.ok());
    auto value = std::move(view.ValueUnsafe());
    doc.SetObject().AddMember("args", value, doc.GetAllocator());

    rapidjson::StringBuffer buffer;
    rapidjson::PrettyWriter writer{buffer};
    doc.Accept(writer);
    ASSERT_EQ(std::string{buffer.GetString()}, R"JSON({
    "args": [
        {
            "sqlType": "STRUCT(foo INTEGER, bar VARCHAR)",
            "physicalType": "STRUCT",
            "validityBuffer": 0,
            "children": [
                {
                    "name": "foo",
                    "sqlType": "INTEGER",
                    "physicalType": "INT32",
                    "validityBuffer": 1,
                    "dataBuffer": 2
                },
                {
                    "name": "bar",
                    "sqlType": "VARCHAR",
                    "physicalType": "VARCHAR",
                    "validityBuffer": 3,
                    "dataBuffer": 4,
                    "lengthBuffer": 5
                }
            ]
        }
    ]
})JSON");
}

}  // namespace
