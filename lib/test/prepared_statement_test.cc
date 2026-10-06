#include <gmock/gmock.h>
#include <gtest/gtest.h>

#include <filesystem>

#include "arrow/array/array_base.h"
#include "arrow/array/array_primitive.h"
#include "arrow/io/memory.h"
#include "arrow/ipc/reader.h"
#include "arrow/table.h"
#include "duckdb/web/test/config.h"
#include "duckdb/web/webdb.h"

using namespace duckdb::web;
using namespace std;
namespace fs = std::filesystem;

namespace {

TEST(PreparedStatent, WithArrayParams) {
    auto db = make_shared<WebDB>(NATIVE);
    WebDB::Connection conn{*db};

    auto data = test::SOURCE_DIR / ".." / "data" / "uni" / "studenten.parquet";
    if (!fs::exists(data)) GTEST_SKIP_(": Missing data");

    std::stringstream ss;
    ss << "SELECT * FROM parquet_scan('" << data.string() << "') WHERE semester = ANY(?)";

    auto stmt = conn.CreatePreparedStatement(ss.str());
    ASSERT_TRUE(stmt.ok()) << stmt.status().message();

    auto buffer = conn.RunPreparedStatement(*stmt, "[[12, 2]]");
    ASSERT_TRUE(buffer.ok()) << buffer.status().message();

    ::arrow::io::BufferReader buffer_reader(*buffer);
    auto const reader = ::arrow::ipc::RecordBatchFileReader::Open(&buffer_reader);
    ASSERT_TRUE(reader.ok()) << reader.status().message();

    auto const batches = (*reader)->ToRecordBatches();
    ASSERT_TRUE(batches.ok()) << batches.status().message();

    for (auto& batch : *batches) {
        auto const rows = batch->GetColumnByName("semester");
        ASSERT_TRUE(rows) << "Must contain `semester` column";

        auto const int_rows = dynamic_pointer_cast<arrow::Int32Array>(rows);

        for (auto i = 0; i < int_rows->length(); ++i) {
            EXPECT_THAT(int_rows->Value(i), testing::AnyOf(testing::Eq(2), testing::Eq(12)));
        }
    }
}

TEST(PreparedStatent, WithArrayParamsIllegal) {
    auto db = make_shared<WebDB>(NATIVE);
    WebDB::Connection conn{*db};

    auto data = test::SOURCE_DIR / ".." / "data" / "uni" / "studenten.parquet";
    if (!fs::exists(data)) GTEST_SKIP_(": Missing data");

    std::stringstream ss;
    ss << "SELECT * FROM parquet_scan('" << data.string() << "') WHERE semester = ANY(?)";

    auto stmt = conn.CreatePreparedStatement(ss.str());
    ASSERT_TRUE(stmt.ok()) << stmt.status().message();

    // passed ununiformed type
    auto buffer = conn.RunPreparedStatement(*stmt, "[[12, [2]]]");
    ASSERT_FALSE(buffer.ok());
    ASSERT_EQ(buffer.status().code(), arrow::StatusCode::ExecutionError);
}

}  // namespace
