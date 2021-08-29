#ifndef INCLUDE_DUCKDB_WEB_ARROW_CASTS_H_
#define INCLUDE_DUCKDB_WEB_ARROW_CASTS_H_

#include <cstdint>

#include "arrow/array/array_dict.h"
#include "arrow/array/array_nested.h"
#include "arrow/array/builder_primitive.h"
#include "arrow/buffer.h"
#include "arrow/record_batch.h"
#include "arrow/result.h"
#include "arrow/status.h"
#include "duckdb/web/config.h"

namespace duckdb {
namespace web {

/// Helper to cast scalar types in arrow schema and return the same type if nothing changes
template <typename PatchScalarFn>
std::shared_ptr<arrow::DataType> castScalarTypes(const std::shared_ptr<arrow::DataType>& type, PatchScalarFn castFn) {
    switch (type->id()) {
        case arrow::Type::STRUCT: {
            std::vector<std::shared_ptr<arrow::Field>> fields;
            bool changed = false;
            fields.reserve(type->num_fields());
            for (auto& field : type->fields()) {
                auto casted = castScalarTypes(field->type(), castFn);
                changed |= casted != field->type();
                fields.push_back(field->WithType(casted));
            }
            if (fields.size() > 0 && !changed) return type;
            return arrow::struct_(std::move(fields));
        }

        case arrow::Type::FIXED_SIZE_LIST: {
            auto fixed = std::dynamic_pointer_cast<arrow::FixedSizeListType>(type);
            auto value_type = castScalarTypes(fixed->value_type(), castFn);
            if (value_type == fixed->value_type()) return type;
            return arrow::fixed_size_list(value_type, fixed->list_size());
        }

        case arrow::Type::LARGE_LIST: {
            auto large = std::dynamic_pointer_cast<arrow::LargeListType>(type);
            auto value_type = castScalarTypes(large->value_type(), castFn);
            if (value_type == large->value_type()) return type;
            return arrow::large_list(value_type);
        }

        case arrow::Type::LIST: {
            auto list = std::dynamic_pointer_cast<arrow::ListType>(type);
            auto value_type = castScalarTypes(list->value_type(), castFn);
            if (value_type == list->value_type()) return type;
            return arrow::list(value_type);
        }

        default:
            return castFn(type);
    }
}

/// Helper to cast scalar types in arrow schema and return the same type if nothing changes
template <typename PatchScalarFn>
std::shared_ptr<arrow::Array> castScalarArray(const std::shared_ptr<arrow::Array>& array, PatchScalarFn castFn) {
    switch (array->type_id()) {
        case arrow::Type::STRUCT: {
            // auto structArray = std::dynamic_pointer_cast<arrow::StructArray>(array);
            // std::vector<std::shared_ptr<arrow::Field>> fields;
            // bool changed = false;
            // fields.reserve(array->num_fields());
            // for (auto& field : structArray->fields()) {
            //     auto casted = castScalarArray(field, castFn);
            //     changed |= casted != field->type();
            //     fields.push_back(casted);
            // }
            // if (fields.size() > 0 && !changed) return array;
            // return std::make_shared<arrow::StructArray>(fields, structArray->);
            return array;
        }

        case arrow::Type::FIXED_SIZE_LIST: {
            auto fixed = std::dynamic_pointer_cast<arrow::FixedSizeListArray>(array);
            auto values = castScalarArray(fixed->values(), castFn);
            if (values == fixed->value_type()) return array;
            return arrow::fixed_size_list(values, array->length());
        }

        case arrow::Type::LARGE_LIST: {
            auto fixed = std::dynamic_pointer_cast<arrow::LargeListArray>(array);
            auto values = castScalarArray(fixed->values(), castFn);
            if (values == fixed->value_type()) return array;
            return arrow::large_list(values, array->length());
        }

        case arrow::Type::LIST: {
            auto fixed = std::dynamic_pointer_cast<arrow::ListArray>(array);
            auto values = castScalarArray(fixed->values(), castFn);
            if (values == fixed->value_type()) return array;
            return arrow::list(values, array->length());
        }

        default:
            return castFn(array);
    }
}

/// Helper to cast scalar types in arrow schema and return the same schema if nothing changes
std::shared_ptr<arrow::Schema> patchSchema(const std::shared_ptr<arrow::Schema>& schema, const WebDBConfig& config);
/// Helper to cast a record batch
arrow::Result<std::shared_ptr<arrow::RecordBatch>> patchRecordBatch(const std::shared_ptr<arrow::RecordBatch>& batch,
                                                                    const std::shared_ptr<arrow::Schema>& schema,
                                                                    const WebDBConfig& config);

}  // namespace web
}  // namespace duckdb

#endif
