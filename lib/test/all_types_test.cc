#include <arrow/type.h>
#include <arrow/type_fwd.h>

#include <filesystem>
#include <sstream>

#include "arrow/array.h"
#include "arrow/array/builder_binary.h"
#include "arrow/array/builder_decimal.h"
#include "arrow/array/builder_dict.h"
#include "arrow/array/builder_nested.h"
#include "arrow/array/builder_primitive.h"
#include "arrow/array/builder_union.h"
#include "arrow/buffer.h"
#include "arrow/io/memory.h"
#include "arrow/ipc/reader.h"
#include "arrow/util/decimal.h"
#include "duckdb/common/types/timestamp.hpp"
#include "duckdb/web/environment.h"
#include "duckdb/web/json_parser.h"
#include "duckdb/web/webdb.h"
#include "gtest/gtest.h"

using namespace duckdb::web;
using namespace std;

namespace {

template <class ARRAY_TYPE, class ARRAY_EXPECTED_TYPE>
void AssertArraysMatch(ARRAY_TYPE array, ARRAY_EXPECTED_TYPE array_expected) {
    auto have = array->ToString();
    auto expected = array_expected->ToString();
    ASSERT_TRUE(array->Equals(*array_expected)) << have << " expected to be " << endl << expected << endl;
}

template <class ARRAY_TYPE, class ARRAY_EXPECTED_TYPE>
void AssertArraysMatchByString(ARRAY_TYPE array, ARRAY_EXPECTED_TYPE array_expected) {
    auto have = array->ToString();
    auto expected = array_expected->ToString();
    ASSERT_EQ(have, expected) << have << " expected to be " << endl << expected << endl;
}

template <class ARROW_TYPE, class C_TYPE, class BATCH_TYPE, class BUILDER_TYPE>
void AssertCorrectBase(string col_name, C_TYPE min, C_TYPE max, BATCH_TYPE batch, BUILDER_TYPE builder) {
    (void)builder->Append(min);
    (void)builder->Append(max);
    (void)builder->AppendNull();

    auto array_expected = builder->Finish().ValueOrDie();
    auto array_actual = batch->GetColumnByName(col_name);

    AssertArraysMatch(array_actual, array_expected);
}

// Assert the values are found in column col_name in batch are equal to [numeric_limits::min(), numeric_limits::max(),
// null]
template <class ARROW_TYPE, class C_TYPE, class BATCH_TYPE>
void AssertPrimitiveCorrect(string col_name, BATCH_TYPE batch) {
    auto builder = make_unique<typename arrow::TypeTraits<ARROW_TYPE>::BuilderType>();
    AssertCorrectBase<ARROW_TYPE>(col_name, numeric_limits<C_TYPE>::min(), numeric_limits<C_TYPE>::max(), batch,
                                  move(builder));
}

// Assert the values are found in column col_name in batch are equal to [min, max, null]
template <class ARROW_TYPE, class C_TYPE, class BATCH_TYPE>
void AssertSimpleTypeCorrect(string col_name, C_TYPE min, C_TYPE max, BATCH_TYPE batch) {
    auto builder = make_unique<typename arrow::TypeTraits<ARROW_TYPE>::BuilderType>();
    AssertCorrectBase<ARROW_TYPE>(col_name, min, max, batch, move(builder));
}

// Assert the values are found in column col_name in batch are equal to [min, max, null]
template <class ARROW_TYPE, class C_TYPE, class BATCH_TYPE, class DATA_TYPE>
void AssertParamTypeCorrect(string col_name, C_TYPE min, C_TYPE max, BATCH_TYPE batch, DATA_TYPE type) {
    auto builder = make_unique<typename arrow::TypeTraits<ARROW_TYPE>::BuilderType>(type, arrow::default_memory_pool());
    AssertCorrectBase<ARROW_TYPE>(col_name, min, max, batch, move(builder));
}

// Assert the result is a matching dictionary array
template <class INDEX_TYPE, class BATCH_TYPE>
void AssertCorrectDictionary(string col_name, vector<string> dictionary, typename INDEX_TYPE::c_type* indices,
                             BATCH_TYPE batch) {
    auto string_builder = make_unique<typename arrow::TypeTraits<arrow::StringType>::BuilderType>();
    (void)string_builder->AppendValues(dictionary);
    auto string_array = string_builder->Finish().ValueOrDie();

    auto index_builder = make_unique<typename arrow::TypeTraits<INDEX_TYPE>::BuilderType>();
    (void)index_builder->Append(indices[0]);
    (void)index_builder->Append(indices[1]);
    (void)index_builder->AppendNull();
    auto index_array = index_builder->Finish().ValueOrDie();

    auto dict_array = make_unique<arrow::DictionaryArray>(
        arrow::dictionary(make_shared<INDEX_TYPE>(), make_shared<arrow::StringType>()), index_array, string_array);
    auto array_actual = batch->GetColumnByName(col_name);
    // FIXME: Restore this test by
    // currently actual is like: {dictionary: ["enum_0","enum_69999"], indices: [0, 1, null] }
    // while dict_array is like: {dictionary: ["enum_0","enum_1",...,"enum_69999"], indices: [0, 69999, null]}
#if 0
    ASSERT_TRUE(array_actual->Equals(*dict_array))
        << array_actual->ToString() << " expected to be " << dict_array->ToString();
#endif
}

shared_ptr<arrow::Array> GetExpectedIntArray() {
    auto type = arrow::list(arrow::field("l", arrow::int32()));
    return duckdb::web::json::ArrayFromJSON(type, "[[], [42, 999, null, null, -42], null]").ValueOrDie();
}

shared_ptr<arrow::Array> GetExpectedDoubleArray() {
    auto type = arrow::list(arrow::field("l", arrow::float64()));
    return duckdb::web::json::ArrayFromJSON(type, "[[],[42.000000, NaN, Inf, -Inf, null, -42.000000],null]")
        .ValueOrDie();
}

// shared_ptr<arrow::Array> GetExpectedDateArray() {
//     auto type = arrow::list(arrow::field("l", make_shared<arrow::Date64Type>()));
//     return duckdb::web::json::ArrayFromJSON(type, "[[], [\"1970-01-01\", Inf, -Inf, null, \"2022-05-12\"], null]")
//         .ValueOrDie();
// };

shared_ptr<arrow::Array> GetExpectedStringArray() {
    auto type = arrow::list(arrow::field("l", make_shared<arrow::StringType>()));
    return duckdb::web::json::ArrayFromJSON(type, "[[], [\"🦆🦆🦆🦆🦆🦆\", \"goose\", null, \"\"], null]").ValueOrDie();
}

shared_ptr<arrow::Array> GetExpectedNestedIntArray() {
    auto nested_array_type = arrow::list(arrow::field("l", arrow::int32()));
    auto array_type = arrow::list(arrow::field("l", nested_array_type));
    return duckdb::web::json::ArrayFromJSON(
               array_type, "[[], [[], [42, 999, null, null, -42], null, [], [42, 999, null, null, -42]], null]")
        .ValueOrDie();
}

shared_ptr<arrow::Array> GetExpectedStructArray() {
    auto value_a_field = arrow::field("a", arrow::int32());
    auto value_b_field = arrow::field("b", make_shared<arrow::StringType>());
    vector<shared_ptr<arrow::Field>> fields = {value_a_field, value_b_field};
    auto type = arrow::struct_(fields);
    return duckdb::web::json::ArrayFromJSON(type, "[{\"a\":null,\"b\":null}, {\"a\":42,\"b\":\"🦆🦆🦆🦆🦆🦆\"}, null]")
        .ValueOrDie();
};

shared_ptr<arrow::Array> GetExpectedStructOfArrayArray() {
    auto value_a_type = arrow::list(arrow::field("l", arrow::int32()));
    auto value_b_type = arrow::list(arrow::field("l", make_shared<arrow::StringType>()));
    vector<shared_ptr<arrow::Field>> fields = {arrow::field("a", value_a_type), arrow::field("b", value_b_type)};
    auto type = arrow::struct_(fields);
    return duckdb::web::json::ArrayFromJSON(type,
                                            "[{\"a\": null, \"b\": null}, {\"a\": [42, 999, null, null, -42], \"b\": "
                                            "[\"🦆🦆🦆🦆🦆🦆\", \"goose\", null, \"\"]}, null]")
        .ValueOrDie();
}

shared_ptr<arrow::Array> GetExpectedArrayOfStructsArray() {
    vector<shared_ptr<arrow::Field>> fields = {arrow::field("a", arrow::int32()),
                                               arrow::field("b", make_shared<arrow::StringType>())};
    auto type = arrow::struct_(fields);
    auto array_type = arrow::list(arrow::field("l", type));
    return duckdb::web::json::ArrayFromJSON(
               array_type, "[[], [{\"a\": null, \"b\": null}, {\"a\": 42, \"b\": \"🦆🦆🦆🦆🦆🦆\"}, null], null]")
        .ValueOrDie();
}

shared_ptr<arrow::Array> GetExpectedMapArray() {
    auto key_builder = make_shared<typename arrow::TypeTraits<arrow::StringType>::BuilderType>();
    auto value_builder = make_shared<typename arrow::TypeTraits<arrow::StringType>::BuilderType>();
    auto map_type = arrow::map(make_shared<arrow::StringType>(), make_shared<arrow::StringType>());
    auto map_array_builder =
        make_shared<arrow::MapBuilder>(arrow::default_memory_pool(), key_builder, value_builder, map_type);

    (void)map_array_builder->Append();
    (void)map_array_builder->Append();
    (void)key_builder->Append("key1");
    (void)key_builder->Append("key2");
    (void)value_builder->Append("🦆🦆🦆🦆🦆🦆");
    (void)value_builder->Append("goose");
    (void)map_array_builder->AppendNull();

    return map_array_builder->Finish().ValueOrDie();
}

shared_ptr<arrow::Array> GetExpectedUnionArray() {
    auto union_builder = std::make_shared<arrow::SparseUnionBuilder>(arrow::default_memory_pool());

    auto str_builder = std::make_shared<arrow::StringBuilder>();
    union_builder->AppendChild(str_builder, "name");

    auto i16_builder = std::make_shared<arrow::Int16Builder>();
    union_builder->AppendChild(i16_builder, "age");

    (void)union_builder->Append(0);
    (void)str_builder->Append("Frank"s);
    (void)i16_builder->AppendNull();

    (void)union_builder->Append(1);
    (void)str_builder->AppendNull();
    (void)i16_builder->Append(5);

    (void)union_builder->AppendNull();

    return union_builder->Finish().ValueOrDie();
}

vector<string> SUPPORTED_TYPES = {"bool",
                                  "tinyint",
                                  "smallint",
                                  "int",
                                  "bigint",
                                  "utinyint",
                                  "usmallint",
                                  "uint",
                                  "ubigint",
                                  "hugeint",
                                  "time",
                                  "date",
                                  "float",
                                  "double",
                                  "varchar",
                                  "small_enum",
                                  "medium_enum",
                                  "large_enum",
                                  "int_array",
                                  "double_array",
                                  "varchar_array",
                                  "nested_int_array",
                                  "struct",
                                  "struct_of_arrays",
                                  "array_of_structs",
                                  "map",
                                  "dec_4_1",
                                  "dec_9_4",
                                  "dec_18_6",
                                  "dec38_10",
                                  "blob",
                                  "bit",
                                  "union"};

vector<string> UNSUPPORTED_TYPES = {
    // Does not work full range as it overflows during multiplication
    "timestamp", "interval", "time_tz",

    // Awaiting Timezone implementation in duckdb to allow patching range: is only partially supported
    "timestamp_s", "timestamp_ms", "timestamp_ns", "timestamp_tz",

    // Linked to timestamp support
    "date_array", "timestamp_array", "timestamptz_array",

    // Currently does not work
    "uuid", "varint"};

TEST(AllTypesTest, FullRangeTypes) {
    auto db = std::make_shared<WebDB>(NATIVE);
    WebDB::Connection conn{*db};

    string replace_str = "REPLACE(";
    for (auto unsupported_type_name : UNSUPPORTED_TYPES) {
        replace_str += "'not_implemented' as " + unsupported_type_name + ",";
    }
    replace_str = replace_str.substr(0, replace_str.size() - 1);
    replace_str += ")";

    auto maybe_result = conn.RunQuery("SELECT * " + replace_str + " from test_all_types();");
    ASSERT_TRUE(maybe_result.ok()) << maybe_result.status().message();
    auto buffer = maybe_result.ValueOrDie();

    // Get rid of database
    db.reset();

    // Get Recordbatch reader
    arrow::io::BufferReader stream(buffer);
    auto reader_result = arrow::ipc::RecordBatchFileReader::Open(&stream);
    ASSERT_TRUE(reader_result.ok()) << reader_result.status().message();
    auto reader = reader_result.ValueOrDie();

    // Confirm expected columns are present
    std::shared_ptr<arrow::Schema> schema = reader->schema();
    for (auto val : SUPPORTED_TYPES) {
        ASSERT_TRUE(schema->GetFieldByName(val) != nullptr) << "Expected column: " << val;
    }

    // Confirm the expected number of columns are received
    auto maybe_batch = reader->ReadRecordBatch(0);
    ASSERT_TRUE(maybe_batch.ok());
    auto batch = maybe_batch.ValueOrDie();
    ASSERT_EQ(batch->num_columns(), SUPPORTED_TYPES.size() + UNSUPPORTED_TYPES.size()) << schema->ToString();

    // Primitive types
    AssertPrimitiveCorrect<arrow::BooleanType, bool>("bool", batch);
    AssertPrimitiveCorrect<arrow::Int8Type, int8_t>("tinyint", batch);
    AssertPrimitiveCorrect<arrow::Int16Type, int16_t>("smallint", batch);
    AssertPrimitiveCorrect<arrow::Int32Type, int>("int", batch);
    AssertPrimitiveCorrect<arrow::UInt8Type, uint8_t>("utinyint", batch);
    AssertPrimitiveCorrect<arrow::UInt16Type, uint16_t>("usmallint", batch);
    AssertPrimitiveCorrect<arrow::UInt32Type, uint32_t>("uint", batch);

    // Floating point types
    AssertSimpleTypeCorrect<arrow::FloatType, double>("float", numeric_limits<float>::lowest(),
                                                      numeric_limits<float>::max(), batch);
    AssertSimpleTypeCorrect<arrow::DoubleType, double>("double", numeric_limits<double>::lowest(),
                                                       numeric_limits<double>::max(), batch);

    // Bigints are cast to double, see arrow_casts.cc
    AssertSimpleTypeCorrect<arrow::DoubleType, double>("bigint", numeric_limits<int64_t>::min(),
                                                       numeric_limits<int64_t>::max(), batch);
    AssertSimpleTypeCorrect<arrow::DoubleType, double>("ubigint", numeric_limits<uint64_t>::min(),
                                                       numeric_limits<uint64_t>::max(), batch);

    // Date/Time types
    AssertParamTypeCorrect<arrow::Time64Type, uint64_t>("time", 0, 86399999999, batch,
                                                        arrow::time64(arrow::TimeUnit::MICRO));
    // AssertParamTypeCorrect<arrow::Time64Type, uint64_t>("time_tz", 0, 86399999999, batch,
    //                                                    arrow::time64(arrow::TimeUnit::MICRO));
    AssertSimpleTypeCorrect<arrow::Date32Type, int32_t>("date", -2147483646, 2147483646, batch);
    AssertSimpleTypeCorrect<arrow::StringType>("varchar", "🦆🦆🦆🦆🦆🦆"s, "goo\x00se"s, batch);
    AssertSimpleTypeCorrect<arrow::BinaryType>("blob", "thisisalongblob\x00withnullbytes"s, "\x00\x00\x00\x61"s, batch);

    // Decimal types
    AssertParamTypeCorrect<arrow::Decimal128Type>("dec_4_1", arrow::Decimal128("-999.9"), arrow::Decimal128("999.9"),
                                                  batch, arrow::decimal128(4, 1));
    AssertParamTypeCorrect<arrow::Decimal128Type>("dec_9_4", arrow::Decimal128("-99999.9999"),
                                                  arrow::Decimal128("99999.9999"), batch, arrow::decimal128(9, 4));
    AssertParamTypeCorrect<arrow::Decimal128Type>("dec_18_6", arrow::Decimal128("-999999999999.999999"),
                                                  arrow::Decimal128("999999999999.999999"), batch,
                                                  arrow::decimal128(18, 6));
    AssertParamTypeCorrect<arrow::Decimal128Type>(
        "dec38_10", arrow::Decimal128("-9999999999999999999999999999.9999999999"),
        arrow::Decimal128("9999999999999999999999999999.9999999999"), batch, arrow::decimal128(38, 10));
    // HugeInt from DuckDB is also emitted as a decimal
    AssertParamTypeCorrect<arrow::Decimal128Type>(
        "hugeint", arrow::Decimal128("-170141183460469231731687303715884105727"),
        arrow::Decimal128("170141183460469231731687303715884105727"), batch, arrow::decimal128(38, 0));

    // Enum types
    vector<string> dictionary_small = {"DUCK_DUCK_ENUM", "GOOSE"};
    uint8_t indices_small[] = {0, 1};
    AssertCorrectDictionary<arrow::UInt8Type>("small_enum", dictionary_small, indices_small, batch);

    vector<string> dictionary_medium;
    for (int i = 0; i < 300; i++) {
        dictionary_medium.push_back("enum_" + to_string(i));
    }
    uint16_t indices_medium[] = {0, 299};
    AssertCorrectDictionary<arrow::UInt16Type>("medium_enum", dictionary_medium, indices_medium, batch);

    vector<string> dictionary_large;
    for (int i = 0; i < 70000; i++) {
        dictionary_large.push_back("enum_" + to_string(i));
    }
    uint32_t indices_large[] = {0, 69999};
    AssertCorrectDictionary<arrow::UInt32Type>("large_enum", dictionary_large, indices_large, batch);

    // Nested types
    AssertArraysMatch(batch->GetColumnByName("int_array"), GetExpectedIntArray());
    AssertArraysMatch(batch->GetColumnByName("varchar_array"), GetExpectedStringArray());
    AssertArraysMatchByString(batch->GetColumnByName("double_array"), GetExpectedDoubleArray());
    AssertArraysMatch(batch->GetColumnByName("nested_int_array"), GetExpectedNestedIntArray());
    AssertArraysMatch(batch->GetColumnByName("struct"), GetExpectedStructArray());
    AssertArraysMatch(batch->GetColumnByName("struct_of_arrays"), GetExpectedStructOfArrayArray());
    AssertArraysMatch(batch->GetColumnByName("array_of_structs"), GetExpectedArrayOfStructsArray());
    AssertArraysMatch(batch->GetColumnByName("map"), GetExpectedMapArray());
    AssertArraysMatch(batch->GetColumnByName("union"), GetExpectedUnionArray());
}
}  // namespace
