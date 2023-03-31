#include <filesystem>
#include <initializer_list>
#include <optional>

#include "arrow/record_batch.h"
#include "duckdb/common/helper.hpp"
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
#include "rapidjson/reader.h"

using namespace duckdb::web;
using duckdb::make_uniq;
using duckdb::unique_ptr;

namespace {

TEST(TableReaderOptions, NoFormat1) {
    rapidjson::Document doc;
    doc.Parse(R"JSON({})JSON");
    json::JSONInsertOptions options;
    ASSERT_EQ(options.table_shape, std::nullopt);
    ASSERT_TRUE(options.ReadFrom(doc).ok());
    ASSERT_EQ(options.table_shape, std::nullopt);
}

TEST(TableReaderOptions, NoFormat2) {
    rapidjson::Document doc;
    doc.Parse(R"JSON({
        "foo": "bar"
    })JSON");
    json::JSONInsertOptions options;
    ASSERT_EQ(options.table_shape, std::nullopt);
    ASSERT_TRUE(options.ReadFrom(doc).ok());
    ASSERT_EQ(options.table_shape, std::nullopt);
}

TEST(TableReaderOptions, FormatRowArray) {
    rapidjson::Document doc;
    doc.Parse(R"JSON({
        "shape": "row-array"
    })JSON");
    json::JSONInsertOptions options;
    ASSERT_EQ(options.table_shape, std::nullopt);
    ASSERT_TRUE(options.ReadFrom(doc).ok());
    ASSERT_TRUE(options.table_shape.has_value());
    ASSERT_EQ(*options.table_shape, json::JSONTableShape::ROW_ARRAY);
}

TEST(TableReaderOptions, FormatColumnObject) {
    rapidjson::Document doc;
    doc.Parse(R"JSON({
        "shape": "column-object"
    })JSON");
    json::JSONInsertOptions options;
    ASSERT_EQ(options.table_shape, std::nullopt);
    ASSERT_TRUE(options.ReadFrom(doc).ok());
    ASSERT_TRUE(options.table_shape.has_value());
    ASSERT_EQ(*options.table_shape, json::JSONTableShape::COLUMN_OBJECT);
}

TEST(TableReaderOptions, FormatInvalidString) {
    rapidjson::Document doc;
    doc.Parse(R"JSON({
        "shape": "invalid"
    })JSON");
    json::JSONInsertOptions options;
    ASSERT_EQ(options.table_shape, std::nullopt);
    auto status = options.ReadFrom(doc);
    ASSERT_FALSE(status.ok());
}

TEST(TableReaderOptions, FormatInvalidInt) {
    rapidjson::Document doc;
    doc.Parse(R"JSON({
        "shape": 42 
    })JSON");
    json::JSONInsertOptions options;
    ASSERT_EQ(options.table_shape, std::nullopt);
    auto status = options.ReadFrom(doc);
    ASSERT_FALSE(status.ok());
}

TEST(TableReaderOptions, Fields) {
    rapidjson::Document doc;
    doc.Parse(R"JSON({
        "shape": "row-array",
        "columns": [
            {"name": "foo", "sqlType": "int32"},
            {"name": "bar", "sqlType": "utf8"}
        ]
    })JSON");
    json::JSONInsertOptions options;
    ASSERT_EQ(options.table_shape, std::nullopt);
    auto status = options.ReadFrom(doc);
    ASSERT_TRUE(status.ok());
    ASSERT_EQ(options.table_shape, json::JSONTableShape::ROW_ARRAY);
    ASSERT_TRUE(options.columns.has_value());
    ASSERT_EQ(options.columns->size(), 2);
    ASSERT_EQ(options.columns->at(0)->name(), "foo");
    ASSERT_EQ(options.columns->at(1)->name(), "bar");
    ASSERT_EQ(options.columns->at(0)->type()->id(), arrow::Type::INT32);
    ASSERT_EQ(options.columns->at(1)->type()->id(), arrow::Type::STRING);
}

static std::shared_ptr<io::InputFileStreamBuffer> CreateStreamBuf(const char* path, std::vector<char> buffer) {
    auto fs = make_uniq<io::MemoryFileSystem>();
    if (!fs->RegisterFileBuffer(path, std::move(buffer)).ok()) return nullptr;
    auto file_page_buffer = std::make_shared<io::FilePageBuffer>(std::move(fs));
    return std::make_shared<io::InputFileStreamBuffer>(file_page_buffer, path);
}

struct TableReaderTest {
    struct TestPrinter {
        std::string operator()(const ::testing::TestParamInfo<TableReaderTest>& info) const {
            return std::string{info.param.name};
        }
    };
    std::string_view name;
    std::string_view input;
    size_t batch_size;
    json::JSONTableShape expected_shape;
    std::string_view expected_type;
    std::vector<std::string_view> expected_batches;
};

struct TableReaderTestSuite : public testing::TestWithParam<TableReaderTest> {};

TEST_P(TableReaderTestSuite, DetectAndReadSingleBatch) {
    constexpr const char* path = "TEST";

    auto& test = GetParam();
    std::vector<char> input_buffer{test.input.data(), test.input.data() + test.input.size()};

    auto fs = std::make_shared<io::MemoryFileSystem>();
    auto fs_buffer = std::make_shared<io::FilePageBuffer>(fs);
    ASSERT_TRUE(fs->RegisterFileBuffer(path, std::move(input_buffer)).ok());

    auto in1 = make_uniq<io::InputFileStream>(fs_buffer, path);
    json::TableType type;
    ASSERT_TRUE(json::InferTableType(*in1, type).ok());
    ASSERT_EQ(type.shape, test.expected_shape);
    ASSERT_EQ(type.type->ToString(), std::string(test.expected_type));

    auto in2 = make_uniq<io::InputFileStream>(fs_buffer, path);
    auto maybe_reader = json::TableReader::Resolve(std::move(in2), std::move(type), test.batch_size);
    ASSERT_TRUE(maybe_reader.ok());

    auto reader = std::move(maybe_reader.ValueUnsafe());
    ASSERT_TRUE(reader->Prepare().ok());

    unsigned i = 0;
    for (;; ++i) {
        auto maybe_batch = reader->Next();
        ASSERT_TRUE(maybe_batch.ok()) << "i=" << i << ": " << maybe_batch.status().message();

        auto& batch = maybe_batch.ValueUnsafe();
        if (batch == nullptr) break;

        ASSERT_TRUE(test.expected_batches.size() > i) << "unexpected non-empty batch, expected " << i;
        ASSERT_EQ(batch->ToString(), std::string(test.expected_batches[i]));
    }
    ASSERT_EQ(test.expected_batches.size(), i)
        << "missing record batch(es), expected " << test.expected_batches.size() << " got " << i;
}

// clang-format off
static std::vector<TableReaderTest> TABLE_READER_TESTS = {

    // ---------------------------------------
    // Column-major table layout
    {
        .name = "cols_int32",
        .input = R"JSON({
            "foo": [1, 4]
        })JSON",
        .batch_size = 10,
        .expected_shape = json::JSONTableShape::COLUMN_OBJECT,
        .expected_type = "struct<foo: int32>",
        .expected_batches = {
            "foo:   [\n    1,\n    4\n  ]\n"
        }
    },
    {
        .name = "cols_int32_int32",
        .input = R"JSON({
            "foo": [1, 4],
            "bar": [3, 2]
        })JSON",
        .batch_size = 10,
        .expected_shape = json::JSONTableShape::COLUMN_OBJECT,
        .expected_type = "struct<bar: int32, foo: int32>",
        .expected_batches = {
            "bar:   [\n    3,\n    2\n  ]\nfoo:   [\n    1,\n    4\n  ]\n"
        }
    },
    {
        .name = "cols_int32_int32_nulls_1",
        .input = R"JSON({
            "foo": [1, 4],
            "bar": [3]
        })JSON",
        .batch_size = 10,
        .expected_shape = json::JSONTableShape::COLUMN_OBJECT,
        .expected_type = "struct<bar: int32, foo: int32>",
        .expected_batches = {
            "bar:   [\n    3,\n    null\n  ]\nfoo:   [\n    1,\n    4\n  ]\n"
        }
    },
    {
        .name = "cols_int32_int32_nulls_2",
        .input = R"JSON({
            "foo": [1, 4],
            "bar": []
        })JSON",
        .batch_size = 10,
        .expected_shape = json::JSONTableShape::COLUMN_OBJECT,
        .expected_type = "struct<bar: null, foo: int32>",
        .expected_batches = {
            "bar: 2 nulls\nfoo:   [\n    1,\n    4\n  ]\n"
        }
    },
    {
        .name = "cols_int32_int32_nulls_3",
        .input = R"JSON({
            "foo": [1],
            "bar": [3, 2]
        })JSON",
        .batch_size = 10,
        .expected_shape = json::JSONTableShape::COLUMN_OBJECT,
        .expected_type = "struct<bar: int32, foo: int32>",
        .expected_batches = {
            "bar:   [\n    3,\n    2\n  ]\nfoo:   [\n    1,\n    null\n  ]\n"
        }
    },
    {
        .name = "cols_int32_split_1",
        .input = R"JSON({
            "foo": [1, 2, 3, 4, 5, 6, 7, 8]
        })JSON",
        .batch_size = 4,
        .expected_shape = json::JSONTableShape::COLUMN_OBJECT,
        .expected_type = "struct<foo: int32>",
        .expected_batches = {
            "foo:   [\n    1,\n    2,\n    3,\n    4\n  ]\n",
            "foo:   [\n    5,\n    6,\n    7,\n    8\n  ]\n",
        }
    },
    {
        .name = "cols_int32_split_2",
        .input = R"JSON({
            "foo": [1, 2, 3, 4, 5, 6, 7, 8, 9]
        })JSON",
        .batch_size = 4,
        .expected_shape = json::JSONTableShape::COLUMN_OBJECT,
        .expected_type = "struct<foo: int32>",
        .expected_batches = {
            "foo:   [\n    1,\n    2,\n    3,\n    4\n  ]\n",
            "foo:   [\n    5,\n    6,\n    7,\n    8\n  ]\n",
            "foo:   [\n    9\n  ]\n",
        }
    },

    // ---------------------------------------
    // Row-major table layout
    {
        .name = "rows_int32",
        .input = R"JSON([
            {"foo": 1},
            {"foo": 4}
        ])JSON",
        .batch_size = 10,
        .expected_shape = json::JSONTableShape::ROW_ARRAY,
        .expected_type = "struct<foo: int32>",
        .expected_batches = {
            "foo:   [\n    1,\n    4\n  ]\n"
        }
    },
    {
        .name = "rows_int32_int32",
        .input = R"JSON([
            {"foo": 1, "bar": 2},
            {"foo": 4, "bar": 3}
        ])JSON",
        .batch_size = 10,
        .expected_shape = json::JSONTableShape::ROW_ARRAY,
        .expected_type = "struct<bar: int32, foo: int32>",
        .expected_batches = {
            "bar:   [\n    2,\n    3\n  ]\nfoo:   [\n    1,\n    4\n  ]\n"
        }
    },
    {
        .name = "rows_int32_int32_nulls_1",
        .input = R"JSON([
            {"foo": 1, "bar": 2},
            {"foo": 4}
        ])JSON",
        .batch_size = 10,
        .expected_shape = json::JSONTableShape::ROW_ARRAY,
        .expected_type = "struct<bar: int32, foo: int32>",
        .expected_batches = {
            "bar:   [\n    2,\n    null\n  ]\nfoo:   [\n    1,\n    4\n  ]\n"
        }
    },
    {
        .name = "rows_int32_int32_nulls_2",
        .input = R"JSON([
            {"foo": 1, "bar": 2},
            {}
        ])JSON",
        .batch_size = 10,
        .expected_shape = json::JSONTableShape::ROW_ARRAY,
        .expected_type = "struct<bar: int32, foo: int32>",
        .expected_batches = {
            "bar:   [\n    2,\n    null\n  ]\nfoo:   [\n    1,\n    null\n  ]\n"
        }
    },
    {
        .name = "rows_int32_split_1",
        .input = R"JSON([
            {"foo": 1},
            {"foo": 2},
            {"foo": 3},
            {"foo": 4},
            {"foo": 5},
            {"foo": 6},
            {"foo": 7},
            {"foo": 8}
        ])JSON",
        .batch_size = 4,
        .expected_shape = json::JSONTableShape::ROW_ARRAY,
        .expected_type = "struct<foo: int32>",
        .expected_batches = {
            "foo:   [\n    1,\n    2,\n    3,\n    4\n  ]\n",
            "foo:   [\n    5,\n    6,\n    7,\n    8\n  ]\n",
        }
    },
    {
        .name = "rows_int32_split_2",
        .input = R"JSON([
            {"foo": 1},
            {"foo": 2},
            {"foo": 3},
            {"foo": 4},
            {"foo": 5},
            {"foo": 6},
            {"foo": 7},
            {"foo": 8},
            {"foo": 9},
        ])JSON",
        .batch_size = 4,
        .expected_shape = json::JSONTableShape::ROW_ARRAY,
        .expected_type = "struct<foo: int32>",
        .expected_batches = {
            "foo:   [\n    1,\n    2,\n    3,\n    4\n  ]\n",
            "foo:   [\n    5,\n    6,\n    7,\n    8\n  ]\n",
            "foo:   [\n    9\n  ]\n",
        }
    },
    {
        .name = "rows_nested_1",
        .input = R"JSON([
            { "a": { "b": 1, "c": 2 } },
            { "a": { "b": 3, "c": 4 } },
            { "a": { "b": 5, "c": 6 } }
        ])JSON",
        .batch_size = 4,
        .expected_shape = json::JSONTableShape::ROW_ARRAY,
        .expected_type = "struct<a: struct<b: double, c: double>>",
        .expected_batches = {
R"RAW(a:   -- is_valid: all not null
  -- child 0 type: double
    [
      1,
      3,
      5
    ]
  -- child 1 type: double
    [
      2,
      4,
      6
    ]
)RAW",
        }
    },
};
// clang-shape on

INSTANTIATE_TEST_SUITE_P(TableReaderTest, TableReaderTestSuite, testing::ValuesIn(TABLE_READER_TESTS),
                         TableReaderTest::TestPrinter());

struct TableImportTest {
    struct TestPrinter {
        std::string operator()(const ::testing::TestParamInfo<TableImportTest>& info) const {
            return std::string{info.param.name};
        }
    };
    std::string_view name;
    std::string_view input_path;
    std::string_view query;
    std::string_view output;
};

struct TableImportTestSuite : public testing::TestWithParam<TableImportTest> {};

TEST_P(TableImportTestSuite, ImportFile) {
    auto& test = GetParam();
    auto db = std::make_shared<WebDB>(NATIVE);
    WebDB::Connection conn{*db};

    auto input = std::filesystem::path(test::SOURCE_DIR) / ".." / test.input_path;
    auto options = R"JSON({
        "name": "sometable"
    })JSON";
    auto status = conn.InsertJSONFromPath(input.string(), options);
    ASSERT_TRUE(status.ok()) << status.message();
}
// clang-format on

static std::vector<TableImportTest> TABLE_IMPORT_TESTS = {
    {
        .name = "vega_movies_1",
        .input_path = "./data/vega/movies.json",
        .query = "",
        .output = "",
    },
};

INSTANTIATE_TEST_SUITE_P(TableImportTest, TableImportTestSuite, testing::ValuesIn(TABLE_IMPORT_TESTS),
                         TableImportTest::TestPrinter());

}  // namespace
