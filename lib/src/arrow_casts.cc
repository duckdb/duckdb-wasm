#include "duckdb/web/arrow_casts.h"

#include "duckdb/web/webdb.h"

namespace duckdb {
namespace web {

/// Helper to cast scalar types in arrow schema and return the same schema if nothing changes
std::shared_ptr<arrow::Schema> patchSchema(const std::shared_ptr<arrow::Schema>& schema, const WebDBConfig& config) {
    std::shared_ptr<arrow::Schema> casted_schema = nullptr;

    // Cast all bigints to floats (if needed
    // We might need to cast more in the future...
    if (!config.emit_bigint) {
        auto umbrella_type = arrow::struct_(schema->fields());
        auto casted_type = castScalarTypes(umbrella_type, [](const std::shared_ptr<arrow::DataType>& type) {
            switch (type->id()) {
                case arrow::Type::INT64:
                case arrow::Type::UINT64:
                    return arrow::float64();
                default:
                    return type;
            }
        });
        auto casted_umbrella_type = std::dynamic_pointer_cast<arrow::StructType>(casted_type);
        if (casted_umbrella_type != umbrella_type) {
            casted_schema = std::make_shared<arrow::Schema>(casted_umbrella_type->fields(), schema->endianness(),
                                                            schema->metadata());
        }
    }
    return (casted_schema != nullptr) ? casted_schema : schema;
}

/// Helper to cast a record batch
arrow::Result<std::shared_ptr<arrow::RecordBatch>> patchRecordBatch(const std::shared_ptr<arrow::RecordBatch>& batch,
                                                                    const std::shared_ptr<arrow::Schema>& schema,
                                                                    const WebDBConfig& config) {
    // Schema the same?
    if (batch->schema() == schema) return batch;

    // Build a double array
    auto buildDoubleArray = [](auto& array) -> arrow::Result<std::shared_ptr<arrow::Array>> {
        arrow::DoubleBuilder builder;
        ARROW_RETURN_NOT_OK(builder.Resize(array.length()));
        for (auto iter = array.begin(); iter != array.end(); ++iter) {
            if (!(*iter).has_value()) {
                builder.UnsafeAppendNull();
            } else {
                builder.UnsafeAppend((*iter).value());
            }
        }
        std::shared_ptr<arrow::Array> out;
        ARROW_RETURN_NOT_OK(builder.Finish(&out));
        return out;
    };

    // Patch all columns
    std::vector<std::shared_ptr<arrow::Array>> arrays;
    for (auto& column : batch->columns()) {
        std::shared_ptr<arrow::Array> out = column;
        if (!config.emit_bigint) {
            switch (out->type_id()) {
                case arrow::Type::INT64: {
                    auto arrayI64 = std::dynamic_pointer_cast<arrow::Int64Array>(out);
                    ARROW_ASSIGN_OR_RAISE(out, buildDoubleArray(*arrayI64));
                    break;
                }
                case arrow::Type::UINT64: {
                    auto arrayU64 = std::dynamic_pointer_cast<arrow::UInt64Array>(out);
                    ARROW_ASSIGN_OR_RAISE(out, buildDoubleArray(*arrayU64));
                    break;
                }
                case arrow::Type::STRUCT: {
                    auto arrayStruct = std::dynamic_pointer_cast<arrow::StructArray>(out);
                }
                default:
                    break;
            }
        }
        arrays.push_back(std::move(out));
    }

    // Create a record batch
    return arrow::RecordBatch::Make(schema, batch->num_rows(), arrays);
}

}  // namespace web
}  // namespace duckdb
