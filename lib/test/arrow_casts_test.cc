#include "duckdb/web/arrow_casts.h"

#include <duckdb/common/types.hpp>

#include "arrow/c/bridge.h"
#include "arrow/status.h"
#include "duckdb/common/arrow/arrow_converter.hpp"
#include "duckdb/web/io/file_page_buffer.h"
#include "duckdb/web/webdb.h"
#include "gtest/gtest.h"

using namespace duckdb::web;

namespace {

TEST(ArrowCasts, PatchBigInt) {
    WebDBConfig config;
    config.query.cast_bigint_to_double = true;
    auto db = std::make_shared<WebDB>(NATIVE);
    WebDB::Connection conn{*db};

    auto result = conn.connection().Query("SELECT (v & 127)::BIGINT FROM generate_series(0, 10) as t(v);");
    ASSERT_FALSE(result->HasError());

    // Configure the output writer
    ArrowSchema raw_schema;
    duckdb::ClientProperties options;
    options.arrow_offset_size = duckdb::ArrowOffsetSize::REGULAR;
    duckdb::ArrowConverter::ToArrowSchema(&raw_schema, result->types, result->names, options);
    auto maybe_schema = arrow::ImportSchema(&raw_schema);
    ASSERT_TRUE(maybe_schema.status().ok());
    auto schema = maybe_schema.MoveValueUnsafe();

    // Patch the schema (if necessary)
    std::shared_ptr<arrow::Schema> patched_schema = nullptr;
    patched_schema = patchSchema(schema, config.query);

    // Make sure the field type was patched
    ASSERT_EQ(patched_schema->num_fields(), 1);
    ASSERT_EQ(patched_schema->field(0)->type()->id(), arrow::Type::DOUBLE);
    auto chunk = result->Fetch();
    ASSERT_EQ(chunk->size(), 11);

    // Import the record batch
    ArrowArray array;
    duckdb::ArrowConverter::ToArrowArray(*chunk, &array, options);
    auto maybe_batch = arrow::ImportRecordBatch(&array, schema);
    ASSERT_TRUE(maybe_batch.ok());
    auto batch = maybe_batch.MoveValueUnsafe();
    ASSERT_EQ(batch->num_rows(), 11);
    ASSERT_EQ(batch->column(0)->type_id(), arrow::Type::INT64);

    // Patch the record batch
    auto maybe_patched = patchRecordBatch(batch, patched_schema, config.query);
    ASSERT_TRUE(maybe_patched.ok());
    auto patched = maybe_patched.MoveValueUnsafe();
    ASSERT_EQ(patched->num_rows(), 11);
    ASSERT_EQ(patched->num_columns(), 1);
    ASSERT_EQ(patched->column(0)->type_id(), arrow::Type::DOUBLE);
}

TEST(ArrowCasts, PatchTimestamp) {
    WebDBConfig config;
    config.query.cast_timestamp_to_date = true;
    auto db = std::make_shared<WebDB>(NATIVE);
    WebDB::Connection conn{*db};

    auto result = conn.connection().Query("SELECT TIMESTAMP '1992-09-20 11:30:00'");
    ASSERT_FALSE(result->HasError());

    // Configure the output writer
    ArrowSchema raw_schema;
    duckdb::ClientProperties options;
    options.arrow_offset_size = duckdb::ArrowOffsetSize::REGULAR;
    duckdb::ArrowConverter::ToArrowSchema(&raw_schema, result->types, result->names, options);
    auto maybe_schema = arrow::ImportSchema(&raw_schema);
    ASSERT_TRUE(maybe_schema.status().ok());
    auto schema = maybe_schema.MoveValueUnsafe();

    // Patch the schema (if necessary)
    std::shared_ptr<arrow::Schema> patched_schema = nullptr;
    patched_schema = patchSchema(schema, config.query);

    // Make sure the field type was patched
    ASSERT_EQ(patched_schema->num_fields(), 1);
    ASSERT_EQ(patched_schema->field(0)->type()->id(), arrow::Type::DATE64);
    auto chunk = result->Fetch();
    ASSERT_EQ(chunk->size(), 1);

    // Import the record batch
    ArrowArray array;
    duckdb::ArrowConverter::ToArrowArray(*chunk, &array, options);
    auto maybe_batch = arrow::ImportRecordBatch(&array, schema);
    ASSERT_TRUE(maybe_batch.ok());
    auto batch = maybe_batch.MoveValueUnsafe();
    ASSERT_EQ(batch->num_rows(), 1);
    ASSERT_EQ(batch->column(0)->type_id(), arrow::Type::TIMESTAMP);

    // Patch the record batch
    auto maybe_patched = patchRecordBatch(batch, patched_schema, config.query);
    ASSERT_TRUE(maybe_patched.ok());
    auto patched = maybe_patched.MoveValueUnsafe();
    ASSERT_EQ(patched->num_rows(), 1);
    ASSERT_EQ(patched->num_columns(), 1);
    ASSERT_EQ(patched->column(0)->type_id(), arrow::Type::DATE64);
}

}  // namespace
