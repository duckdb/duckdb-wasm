#include "duckdb/web/arrow_casts.h"

#include <arrow/buffer.h>
#include <arrow/result.h>
#include <arrow/type_fwd.h>

#include <chrono>
#include <iomanip>

#include "duckdb/web/config.h"
#include "duckdb/web/webdb.h"

namespace duckdb {
namespace web {

/// Helper to cast scalar types in arrow schema and return the same schema if nothing changes
std::shared_ptr<arrow::Schema> patchSchema(const std::shared_ptr<arrow::Schema>& schema, const QueryConfig& config) {
    // Has no cast?
    if (!config.hasAnyCast()) return schema;

    // Cast all bigints to floats (if needed
    // We might need to cast more in the future...
    std::shared_ptr<arrow::Schema> casted_schema = nullptr;
    auto umbrella_type = arrow::struct_(schema->fields());
    auto casted_type = castScalarTypes(umbrella_type, [config](const std::shared_ptr<arrow::DataType>& type) {
        switch (type->id()) {
            case arrow::Type::TIMESTAMP:
                return config.cast_timestamp_to_date.value_or(false) ? arrow::date64() : type;
            case arrow::Type::INT64:
            case arrow::Type::UINT64:
                return config.cast_bigint_to_double.value_or(false) ? arrow::float64() : type;
            default:
                return type;
        }
    });
    auto casted_umbrella_type = std::dynamic_pointer_cast<arrow::StructType>(casted_type);
    if (casted_umbrella_type != umbrella_type) {
        return std::make_shared<arrow::Schema>(casted_umbrella_type->fields(), schema->endianness(),
                                               schema->metadata());
    } else {
        return schema;
    }
}

/// Helper to cast a record batch
arrow::Result<std::shared_ptr<arrow::RecordBatch>> patchRecordBatch(const std::shared_ptr<arrow::RecordBatch>& batch,
                                                                    const std::shared_ptr<arrow::Schema>& schema,
                                                                    const QueryConfig& config) {
    // Schema the same?
    if (batch->schema() == schema) return batch;

    // Patch all columns
    std::vector<std::shared_ptr<arrow::Array>> arrays;
    for (auto& column : batch->columns()) {
        std::shared_ptr<arrow::Array> out = column;
        switch (out->type_id()) {
            case arrow::Type::INT64: {
                if (config.cast_bigint_to_double.value_or(false)) {
                    auto array = std::dynamic_pointer_cast<arrow::Int64Array>(out);
                    auto in = reinterpret_cast<const arrow::Int64Type::c_type*>(array->values()->data());
                    ARROW_ASSIGN_OR_RAISE(auto buffer,
                                          arrow::AllocateBuffer(array->length() * sizeof(arrow::DoubleType::c_type)));
                    auto writer = reinterpret_cast<arrow::DoubleType::c_type*>(buffer->mutable_data());
                    for (auto i = 0; i < array->length(); ++i) {
                        writer[i] = in[i];
                    }
                    out = std::make_shared<arrow::DoubleArray>(
                        array->length(), std::shared_ptr<arrow::Buffer>(buffer.release()), array->null_bitmap(),
                        array->null_count(), array->offset());
                }
                break;
            }
            case arrow::Type::UINT64: {
                if (config.cast_bigint_to_double.value_or(false)) {
                    auto array = std::dynamic_pointer_cast<arrow::UInt64Array>(out);
                    auto in = reinterpret_cast<const arrow::UInt64Type::c_type*>(array->values()->data());
                    ARROW_ASSIGN_OR_RAISE(auto buffer,
                                          arrow::AllocateBuffer(array->length() * sizeof(arrow::DoubleType::c_type)));
                    auto writer = reinterpret_cast<arrow::DoubleType::c_type*>(buffer->mutable_data());
                    for (auto i = 0; i < array->length(); ++i) {
                        writer[i] = in[i];
                    }
                    out = std::make_shared<arrow::DoubleArray>(
                        array->length(), std::shared_ptr<arrow::Buffer>(buffer.release()), array->null_bitmap(),
                        array->null_count(), array->offset());
                }
                break;
            }
            case arrow::Type::TIMESTAMP: {
                if (config.cast_timestamp_to_date.value_or(false)) {
                    static_assert(std::is_same<arrow::TimestampType::c_type, int64_t>::value);
                    static_assert(std::is_same<arrow::Date64Type::c_type, int64_t>::value);
                    auto array = std::dynamic_pointer_cast<arrow::TimestampArray>(out);
                    auto type = reinterpret_cast<const arrow::TimestampType*>(array->type().get());
                    auto in = reinterpret_cast<const arrow::TimestampType::c_type*>(array->values()->data());
                    ARROW_ASSIGN_OR_RAISE(auto buffer,
                                          arrow::AllocateBuffer(array->length() * sizeof(arrow::Date64Type::c_type)));
                    auto writer = reinterpret_cast<arrow::Date64Type::c_type*>(buffer->mutable_data());
                    switch (type->unit()) {
                        case arrow::TimeUnit::SECOND:
                            for (auto i = 0; i < array->length(); ++i) {
                                writer[i] = in[i] * 1000;
                            }
                            break;
                        case arrow::TimeUnit::MILLI:
                            for (auto i = 0; i < array->length(); ++i) {
                                writer[i] = in[i];
                            }
                            break;
                        case arrow::TimeUnit::MICRO:
                            for (auto i = 0; i < array->length(); ++i) {
                                writer[i] = in[i] / 1000;
                            }
                            break;
                        case arrow::TimeUnit::NANO:
                            for (auto i = 0; i < array->length(); ++i) {
                                writer[i] = in[i] / (1000 * 1000);
                            }
                            break;
                    }
                    out = std::make_shared<arrow::Date64Array>(
                        array->length(), std::shared_ptr<arrow::Buffer>(buffer.release()), array->null_bitmap(),
                        array->null_count(), array->offset());
                }
                break;
            }
            default:
                break;
        }
        arrays.push_back(std::move(out));
    }

    // Create a record batch
    return arrow::RecordBatch::Make(schema, batch->num_rows(), arrays);
}

}  // namespace web
}  // namespace duckdb
