#include "duckdb/web/arrow_type_mapping.h"

#include "arrow/array/array_binary.h"
#include "arrow/array/array_primitive.h"
#include "arrow/result.h"
#include "arrow/status.h"
#include "arrow/type.h"
#include "arrow/type_fwd.h"
#include "duckdb/common/types.hpp"
#include "duckdb/common/types/vector.hpp"
#include "duckdb/web/webdb.h"

namespace duckdb {
namespace web {

/// Map arrow type
arrow::Result<duckdb::LogicalType> mapArrowTypeToDuckDB(const arrow::DataType& type) {
    switch (type.id()) {
        case arrow::Type::type::MAX_ID:
        case arrow::Type::type::NA:
        case arrow::Type::type::RUN_END_ENCODED:
            return duckdb::LogicalTypeId::INVALID;
        case arrow::Type::type::BOOL:
            return duckdb::LogicalTypeId::BOOLEAN;
        case arrow::Type::type::UINT8:
            return duckdb::LogicalTypeId::UTINYINT;
        case arrow::Type::type::INT8:
            return duckdb::LogicalTypeId::TINYINT;
        case arrow::Type::type::UINT16:
            return duckdb::LogicalTypeId::USMALLINT;
        case arrow::Type::type::INT16:
            return duckdb::LogicalTypeId::SMALLINT;
        case arrow::Type::type::UINT32:
            return duckdb::LogicalTypeId::UINTEGER;
        case arrow::Type::type::INT32:
            return duckdb::LogicalTypeId::INTEGER;
        case arrow::Type::type::UINT64:
            return duckdb::LogicalTypeId::UBIGINT;
        case arrow::Type::type::INT64:
            return duckdb::LogicalTypeId::BIGINT;
        case arrow::Type::type::HALF_FLOAT:
            return duckdb::LogicalTypeId::FLOAT;
        case arrow::Type::type::FLOAT:
            return duckdb::LogicalTypeId::FLOAT;
        case arrow::Type::type::DOUBLE:
            return duckdb::LogicalTypeId::DOUBLE;
        case arrow::Type::type::STRING:
            return duckdb::LogicalTypeId::VARCHAR;
        case arrow::Type::type::BINARY:
            return duckdb::LogicalTypeId::BLOB;
        case arrow::Type::type::FIXED_SIZE_BINARY:
            return duckdb::LogicalTypeId::BLOB;
        case arrow::Type::type::DATE32:
            return duckdb::LogicalTypeId::DATE;
        case arrow::Type::type::DATE64:
            return duckdb::LogicalTypeId::DATE;
        case arrow::Type::type::TIMESTAMP:
            return duckdb::LogicalTypeId::TIMESTAMP;
        case arrow::Type::type::TIME32:
            return duckdb::LogicalTypeId::TIMESTAMP;
        case arrow::Type::type::TIME64:
            return duckdb::LogicalTypeId::TIMESTAMP;
        case arrow::Type::type::INTERVAL_MONTHS:
            return duckdb::LogicalTypeId::INTERVAL;
        case arrow::Type::type::INTERVAL_DAY_TIME:
            return duckdb::LogicalTypeId::INTERVAL;
        case arrow::Type::type::INTERVAL_MONTH_DAY_NANO:
            return duckdb::LogicalTypeId::INTERVAL;
        case arrow::Type::type::DECIMAL128: {
            auto& decimal = *dynamic_cast<const arrow::Decimal128Type*>(&type);
            return duckdb::LogicalType::DECIMAL(decimal.precision(), decimal.scale());
        }
        case arrow::Type::type::DECIMAL256: {
            auto& decimal = *dynamic_cast<const arrow::Decimal256Type*>(&type);
            return duckdb::LogicalType::DECIMAL(decimal.precision(), decimal.scale());
        }
        case arrow::Type::type::LIST: {
            ARROW_ASSIGN_OR_RAISE(auto inner,
                                  mapArrowTypeToDuckDB(*dynamic_cast<const arrow::ListType*>(&type)->value_type()));
            return duckdb::LogicalType::LIST(inner);
        }
        case arrow::Type::type::STRUCT: {
            child_list_t<LogicalType> children;
            for (auto& field : type.fields()) {
                ARROW_ASSIGN_OR_RAISE(auto t, mapArrowTypeToDuckDB(*field->type()));
                children.push_back({field->name(), t});
            }
            return duckdb::LogicalType::STRUCT(children);
        }
        case arrow::Type::type::DICTIONARY: {
            child_list_t<LogicalType> children;
            for (auto& field : type.fields()) {
                ARROW_ASSIGN_OR_RAISE(auto t, mapArrowTypeToDuckDB(*field->type()));
                children.push_back({field->name(), t});
            }
            return duckdb::LogicalType::STRUCT(children);
        }
        case arrow::Type::type::MAP: {
            child_list_t<LogicalType> children;
            for (auto& field : type.fields()) {
                ARROW_ASSIGN_OR_RAISE(auto t, mapArrowTypeToDuckDB(*field->type()));
                children.push_back({field->name(), t});
            }
            return duckdb::LogicalType::STRUCT(children);
        }
        case arrow::Type::type::FIXED_SIZE_LIST: {
            ARROW_ASSIGN_OR_RAISE(
                auto inner, mapArrowTypeToDuckDB(*dynamic_cast<const arrow::FixedSizeListType*>(&type)->value_type()));
            return duckdb::LogicalType::LIST(inner);
        }
        case arrow::Type::type::DURATION:
            return duckdb::LogicalTypeId::TIME;
        case arrow::Type::type::LARGE_STRING:
            return duckdb::LogicalTypeId::VARCHAR;
        case arrow::Type::type::LARGE_BINARY:
            return duckdb::LogicalTypeId::BLOB;
        case arrow::Type::type::LARGE_LIST: {
            ARROW_ASSIGN_OR_RAISE(
                auto inner, mapArrowTypeToDuckDB(*dynamic_cast<const arrow::LargeListType*>(&type)->value_type()));
            return duckdb::LogicalType::LIST(inner);
        }
        case arrow::Type::type::EXTENSION:
        case arrow::Type::type::SPARSE_UNION:
        case arrow::Type::type::DENSE_UNION:
        case arrow::Type::type::STRING_VIEW:
        case arrow::Type::type::BINARY_VIEW:
        case arrow::Type::type::LIST_VIEW:
        case arrow::Type::type::LARGE_LIST_VIEW:
            return arrow::Status::NotImplemented("DuckDB type mapping for: ", type.ToString());
    }
    return duckdb::LogicalTypeId::INVALID;
}

arrow::Result<std::shared_ptr<arrow::DataType>> mapDuckDBTypeToArrow(const duckdb::LogicalType& type) {
    switch (type.id()) {
        case duckdb::LogicalTypeId::BOOLEAN:
            return arrow::boolean();
        case duckdb::LogicalTypeId::UTINYINT:
            return arrow::uint8();
        case duckdb::LogicalTypeId::TINYINT:
            return arrow::int8();
        case duckdb::LogicalTypeId::USMALLINT:
            return arrow::uint16();
        case duckdb::LogicalTypeId::SMALLINT:
            return arrow::int16();
        case duckdb::LogicalTypeId::UINTEGER:
            return arrow::uint32();
        case duckdb::LogicalTypeId::INTEGER:
            return arrow::int32();
        case duckdb::LogicalTypeId::UBIGINT:
            return arrow::uint64();
        case duckdb::LogicalTypeId::BIGINT:
            return arrow::int64();
        case duckdb::LogicalTypeId::FLOAT:
            return arrow::float32();
        case duckdb::LogicalTypeId::DOUBLE:
            return arrow::float64();
        case duckdb::LogicalTypeId::VARCHAR:
            return arrow::utf8();
        case duckdb::LogicalTypeId::BLOB:
            return arrow::binary();
        case duckdb::LogicalTypeId::DATE:
            return arrow::date64();
        // XXX
        default:
            return arrow::Status::ExecutionError(std::string("type mapping not implemented for duckdb type: ") +
                                                 type.ToString());
    }
}

/// Convert an arrow array to a DuckDB vector
arrow::Status convertArrowArrayToDuckDBVector(arrow::Array& in, duckdb::Vector& out) {
    auto in_type = in.type();
    switch (in_type->id()) {
        // Map null
        case arrow::Type::type::NA:
            out.Reference(Value());
            break;

        // Arrow bitpacks booleans
        case arrow::Type::type::BOOL: {
            auto& a = *dynamic_cast<const arrow::BooleanArray*>(&in);
            if (out.GetType().id() == LogicalTypeId::BOOLEAN) {
                return arrow::Status::ExecutionError("invalid boolean array");
            }
            for (size_t i = 0; i < a.length(); ++i) {
                out.GetData()[i] = a.Value(i);
            }
        }

        // Store plain data pointer
        case arrow::Type::type::INT32:
        case arrow::Type::type::UINT8:
        case arrow::Type::type::INT8:
        case arrow::Type::type::UINT16:
        case arrow::Type::type::INT16:
        case arrow::Type::type::UINT32:
        case arrow::Type::type::UINT64:
        case arrow::Type::type::INT64:
        case arrow::Type::type::HALF_FLOAT:
        case arrow::Type::type::FLOAT:
        case arrow::Type::type::DOUBLE:
        case arrow::Type::type::TIMESTAMP:
        case arrow::Type::type::TIME32:
        case arrow::Type::type::TIME64: {
            auto* data = reinterpret_cast<uint8_t*>(in.data()->buffers[1]->address());
            duckdb::FlatVector::SetData(out, data);
            break;
        }

        // Manually convert string_t
        case arrow::Type::type::LARGE_STRING:
        case arrow::Type::type::STRING: {
            auto& a = *dynamic_cast<const arrow::StringArray*>(&in);
            auto strings = FlatVector::GetData<string_t>(out);
            for (size_t i = 0; i < a.length(); ++i) {
                auto s = a.GetView(i);
                strings[i] = string_t(s.data(), s.length());
            }
            break;
        }

        // Unsupported for UDF MVP
        case arrow::Type::type::DATE32:
        case arrow::Type::type::DATE64:
        case arrow::Type::type::BINARY:
        case arrow::Type::type::FIXED_SIZE_BINARY:
        case arrow::Type::type::INTERVAL_MONTHS:
        case arrow::Type::type::INTERVAL_DAY_TIME:
        case arrow::Type::type::DECIMAL128:
        case arrow::Type::type::DECIMAL256:
        case arrow::Type::type::LIST:
        case arrow::Type::type::STRUCT:
        case arrow::Type::type::SPARSE_UNION:
        case arrow::Type::type::DENSE_UNION:
        case arrow::Type::type::DICTIONARY:
        case arrow::Type::type::MAP:
        case arrow::Type::type::FIXED_SIZE_LIST:
        case arrow::Type::type::DURATION:
        case arrow::Type::type::LARGE_BINARY:
        case arrow::Type::type::LARGE_LIST:
        case arrow::Type::type::INTERVAL_MONTH_DAY_NANO:
        default:
            return arrow::Status::ExecutionError(std::string("array conversion not implemented for arrow type: ") +
                                                 in.type()->ToString());
    }
    return arrow::Status::OK();
}

}  // namespace web
}  // namespace duckdb
