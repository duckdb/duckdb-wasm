#include <arrow/memory_pool.h>

#include <filesystem>
#include <fstream>
#include <memory>
#include <sstream>

#include "arrow/io/memory.h"
#include "arrow/ipc/options.h"
#include "arrow/ipc/writer.h"
#include "arrow/record_batch.h"
#include "arrow/result.h"
#include "arrow/type.h"
#include "duckdb/common/types/date.hpp"
#include "duckdb/common/types/timestamp.hpp"
#include "duckdb/web/io/ifstream.h"
#include "duckdb/web/io/memory_filesystem.h"
#include "duckdb/web/json_parser.h"
#include "duckdb/web/test/config.h"
#include "duckdb/web/webdb.h"
#include "gtest/gtest.h"

using namespace duckdb;
using namespace duckdb::web;
using namespace duckdb::web::test;

namespace {

struct ArrowColumn {
    /// The number of rows
    std::shared_ptr<arrow::DataType> type;
    /// The data
    std::string values;
};

struct ArrowBatch {
    /// The number of rows
    int64_t num_rows;
    /// The columns
    std::vector<ArrowColumn> columns;
};

struct ArrowInsertTest {
    struct TestPrinter {
        std::string operator()(const ::testing::TestParamInfo<ArrowInsertTest>& info) const {
            return std::string{info.param.name};
        }
    };
    std::string_view name;
    std::shared_ptr<arrow::Schema> schema;
    std::vector<ArrowBatch> batches;
    size_t chunk_size;
    std::string_view options;
    std::string_view query;
    vector<vector<Value>> expected_output;
};

struct ArrowInsertTestSuite : public testing::TestWithParam<ArrowInsertTest> {};

TEST_P(ArrowInsertTestSuite, TestInsert) {
    auto& test = GetParam();

    /// Create the record batches
    std::vector<std::shared_ptr<arrow::RecordBatch>> batches;
    for (auto& batch : test.batches) {
        std::vector<std::shared_ptr<arrow::Array>> arrays;
        for (auto& c : batch.columns) {
            auto maybe_array = json::ArrayFromJSON(c.type, c.values);
            ASSERT_TRUE(maybe_array.ok()) << maybe_array.status().message();
            arrays.push_back(maybe_array.ValueUnsafe());
        }
        batches.push_back(arrow::RecordBatch::Make(test.schema, batch.num_rows, arrays));
    }

    // Prepare the writing of the record batch stream
    auto maybe_out_stream = arrow::io::BufferOutputStream::Create();
    ASSERT_TRUE(maybe_out_stream.ok());
    auto& out_stream = maybe_out_stream.ValueUnsafe();
    auto ipc_options = arrow::ipc::IpcWriteOptions::Defaults();
    ipc_options.use_threads = false;

    // Write the record batch stream
    auto maybe_ok = arrow::ipc::WriteRecordBatchStream(batches, ipc_options, out_stream.get());
    ASSERT_TRUE(maybe_ok.ok()) << maybe_ok.message();
    auto maybe_buffer = out_stream->Finish();
    ASSERT_TRUE(maybe_buffer.ok()) << maybe_buffer.status().message();
    auto& buffer = maybe_buffer.ValueUnsafe();

    // Stream the buffer to the WebDB
    auto db = std::make_shared<WebDB>(NATIVE);
    WebDB::Connection conn{*db};
    for (size_t ofs = 0; ofs < buffer->size();) {
        auto chunk_begin = buffer->data() + ofs;
        auto chunk_size = std::min<size_t>(buffer->size() - ofs, test.chunk_size);
        nonstd::span chunk{chunk_begin, chunk_size};
        auto maybe_ok = conn.InsertArrowFromIPCStream(chunk, ofs == 0 ? test.options : "");
        ASSERT_TRUE(maybe_ok.ok()) << maybe_ok.message();
        ofs += chunk_size;
    }
    ASSERT_TRUE(maybe_ok.ok()) << maybe_ok.message();

    // Query the resulting table
    auto result = conn.connection().Query(std::string{test.query});
    ASSERT_TRUE(!result->HasError()) << result->GetError();
    for (idx_t col_idx = 0; col_idx < test.expected_output.size(); col_idx++) {
        ASSERT_TRUE(CHECK_COLUMN(*result, col_idx, test.expected_output[col_idx]));
    }
}

// clang-format off
static std::vector<ArrowInsertTest> ARROW_IMPORT_TEST = {
    {
        .name = "integers_1",
        .schema = arrow::schema({
            arrow::field("a", arrow::int32()),
            arrow::field("b", arrow::int32()),
            arrow::field("c", arrow::int32()),
        }),
        .batches = std::vector<ArrowBatch>{
            ArrowBatch {
                .num_rows = 3,
                .columns = {
                    { arrow::int32(), "[1, 4, 7]" },
                    { arrow::int32(), "[2, 5, 8]" },
                    { arrow::int32(), "[3, 6, 9]" },
                }
            }
        },
        .chunk_size = 1024,
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
        .name = "integers_2",
        .schema = arrow::schema({
            arrow::field("a", arrow::int32()),
            arrow::field("b", arrow::int16()),
            arrow::field("c", arrow::int64()),
        }),
        .batches = std::vector<ArrowBatch>{
            ArrowBatch {
                .num_rows = 3,
                .columns = {
                    { arrow::int32(), "[1, 4, 7]" },
                    { arrow::int16(), "[2, 5, 8]" },
                    { arrow::int64(), "[3, 6, 9]" },
                }
            }
        },
        .chunk_size = 1024,
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
        .name = "mixed_1",
        .schema = arrow::schema({
            arrow::field("a", arrow::int32()),
            arrow::field("b", arrow::int16()),
            arrow::field("c", arrow::utf8()),
        }),
        .batches = std::vector<ArrowBatch>{
            ArrowBatch {
                .num_rows = 3,
                .columns = {
                    { arrow::int32(), "[1, 4, 7]" },
                    { arrow::int16(), "[2, 5, 8]" },
                    { arrow::utf8(), R"(["3", "6", "9"])" },
                }
            }
        },
        .chunk_size = 1024,
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
        .name = "smallchunks_1",
        .schema = arrow::schema({
            arrow::field("a", arrow::int32()),
            arrow::field("b", arrow::int16()),
            arrow::field("c", arrow::utf8()),
        }),
        .batches = std::vector<ArrowBatch>{
            ArrowBatch {
                .num_rows = 3,
                .columns = {
                    { arrow::int32(), "[1, 4, 7]" },
                    { arrow::int16(), "[2, 5, 8]" },
                    { arrow::utf8(), R"(["3", "6", "9"])" },
                }
            }
        },
        .chunk_size = 8,
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
};
// clang-format on

INSTANTIATE_TEST_SUITE_P(ArrowInsertTest, ArrowInsertTestSuite, testing::ValuesIn(ARROW_IMPORT_TEST),
                         ArrowInsertTest::TestPrinter());

}  // namespace
