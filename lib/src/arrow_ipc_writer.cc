#include "duckdb/web/arrow_ipc_writer.h"
#include "duckdb/web/status.h"

#include <cmath>
#include <cstring>

#include "duckdb/common/arrow/arrow_converter.hpp"
#include "duckdb/common/types/hugeint.hpp"
#include "duckdb/common/vector/flat_vector.hpp"
#include "duckdb/common/vector_operations/vector_operations.hpp"
#include "duckdb/function/table/arrow/arrow_duck_schema.hpp"
#include "duckdb/main/client_properties.hpp"
#include "duckdb/main/query_result.hpp"
#include "nanoarrow/nanoarrow.hpp"
#include "nanoarrow/nanoarrow_ipc.hpp"

namespace duckdb {
namespace web {

namespace {

/// Raise a nanoarrow error as arrow status
web::Status NanoarrowStatus(ArrowErrorCode code, ArrowError& error, const char* what) {
    if (code == NANOARROW_OK) return web::Status::OK();
    return web::Status::ExecutionError(std::string{what} + ": " + ArrowErrorMessage(&error));
}

#define RETURN_NOT_OK_NANOARROW(EXPR, WHAT)                             \
    do {                                                                \
        ArrowError nanoarrow_error__{};                                 \
        WEB_RETURN_NOT_OK(NanoarrowStatus(EXPR, nanoarrow_error__, WHAT)); \
    } while (0)

/// The DuckDB type a column is cast to before the Arrow conversion, so that the query config casts
/// are applied by DuckDB. Only top level columns are cast, as before.
LogicalType CastedType(const LogicalType& type, const QueryConfig& config) {
    switch (type.id()) {
        case LogicalTypeId::BIGINT:
        case LogicalTypeId::UBIGINT:
            return config.cast_bigint_to_double.value_or(false) ? LogicalType::DOUBLE : type;
        case LogicalTypeId::DECIMAL:
            return config.cast_decimal_to_double.value_or(false) ? LogicalType::DOUBLE : type;
        case LogicalTypeId::TIMESTAMP:
        case LogicalTypeId::TIMESTAMP_SEC:
        case LogicalTypeId::TIMESTAMP_MS:
        case LogicalTypeId::TIMESTAMP_NS:
        case LogicalTypeId::TIMESTAMP_TZ:
            // A timestamp in milliseconds has the layout of an Arrow date64, the schema is patched below
            return config.cast_timestamp_to_date.value_or(false) ? LogicalType::TIMESTAMP_MS : type;
        default:
            return type;
    }
}

}  // namespace

struct ArrowIPCWriter::Impl {
    ClientContext& context;
    QueryConfig config;
    ClientProperties arrow_options;
    /// The types of the result and the types after the casts
    vector<LogicalType> types;
    vector<LogicalType> casted_types;
    vector<string> names;
    bool needs_cast = false;
    unordered_map<idx_t, const shared_ptr<ArrowTypeExtensionData>> extension_type_cast;
    /// The Arrow schema, released by the writer
    nanoarrow::UniqueSchema schema;
    /// The IPC writer, appending to buffer
    nanoarrow::ipc::UniqueWriter writer;
    nanoarrow::UniqueBuffer buffer;
    bool schema_written = false;

    Impl(ClientContext& context, vector<LogicalType> types_p, vector<string> names_p, const QueryConfig& config,
         bool lossless_conversion)
        : context(context),
          config(config),
          arrow_options("UTC", ArrowOffsetSize::REGULAR, false, false, lossless_conversion, ArrowFormatVersion::V1_0,
                        &context),
          types(std::move(types_p)),
          names(std::move(names_p)) {
        for (auto& type : types) {
            casted_types.push_back(CastedType(type, config));
            needs_cast |= casted_types.back() != type;
        }
        extension_type_cast = ArrowTypeExtensionData::GetExtensionTypes(context, casted_types);
        ArrowConverter::ToArrowSchema(schema.get(), casted_types, names, arrow_options);
        PatchSchema();
    }

    /// Patch the Arrow schema for the casts that only change the Arrow type
    void PatchSchema() {
        if (!config.cast_timestamp_to_date.value_or(false)) return;
        for (idx_t col = 0; col < types.size(); col++) {
            if (casted_types[col].id() != LogicalTypeId::TIMESTAMP_MS || types[col] == casted_types[col]) continue;
            auto child = schema->children[col];
            // DuckDB keeps the format string alive in the schema holder, it is not freed on its own
            if (std::strncmp(child->format, "tsm:", 4) == 0) {
                child->format = "tdm";
            }
        }
    }

    /// Initialize the writer, appending to the buffer
    web::Status InitWriter() {
        buffer.reset();
        ArrowBufferInit(buffer.get());
        nanoarrow::ipc::UniqueOutputStream output;
        RETURN_NOT_OK_NANOARROW(ArrowIpcOutputStreamInitBuffer(output.get(), buffer.get()), "output stream");
        writer.reset();
        RETURN_NOT_OK_NANOARROW(ArrowIpcWriterInit(writer.get(), output.get()), "writer");
        schema_written = false;
        return web::Status::OK();
    }

    /// Take the bytes written so far
    std::shared_ptr<web::Buffer> TakeBuffer() {
        auto out = web::Buffer::FromString(
            std::string{reinterpret_cast<const char*>(buffer->data), static_cast<size_t>(buffer->size_bytes)});
        buffer->size_bytes = 0;
        return out;
    }

    web::Status WriteSchema() {
        ArrowError error{};
        WEB_RETURN_NOT_OK(
            NanoarrowStatus(ArrowIpcWriterWriteSchema(writer.get(), schema.get(), &error), error, "schema"));
        schema_written = true;
        return web::Status::OK();
    }

    web::Status WriteChunk(DataChunk& chunk) {
        // Apply the casts of the query config
        DataChunk casted;
        DataChunk* to_convert = &chunk;
        if (needs_cast) {
            casted.Initialize(Allocator::DefaultAllocator(), casted_types, chunk.size());
            for (idx_t col = 0; col < types.size(); col++) {
                if (types[col] == casted_types[col]) {
                    casted.data[col].Reference(chunk.data[col]);
                } else if (types[col].id() == LogicalTypeId::DECIMAL) {
                    CastDecimalToDouble(chunk.data[col], casted.data[col], chunk.size());
                } else {
                    VectorOperations::Cast(context, chunk.data[col], casted.data[col], chunk.size());
                }
            }
            casted.SetCardinality(chunk.size());
            to_convert = &casted;
        }
        // Convert to an Arrow array and encode it
        nanoarrow::UniqueArray array;
        ArrowConverter::ToArrowArray(*to_convert, array.get(), arrow_options, extension_type_cast);
        nanoarrow::UniqueArrayView view;
        ArrowError error{};
        WEB_RETURN_NOT_OK(NanoarrowStatus(ArrowArrayViewInitFromSchema(view.get(), schema.get(), &error), error,
                                            "array view"));
        WEB_RETURN_NOT_OK(
            NanoarrowStatus(ArrowArrayViewSetArray(view.get(), array.get(), &error), error, "array view"));
        // Dictionaries precede the batch that uses them and are repeated for every batch, as each array carries
        // its own (nanoarrow does the same in ArrowIpcWriterWriteArrayStream)
        int64_t next_dictionary_id = 0;
        WEB_RETURN_NOT_OK(WriteDictionaries(*view.get(), next_dictionary_id));
        return NanoarrowStatus(ArrowIpcWriterWriteArrayView(writer.get(), view.get(), &error), error,
                               "record batch");
    }

    /// Casts decimals the way Arrow did: the unscaled value as double times 10^-scale, which is not exactly
    /// rounded but is what the results contained so far
    static void CastDecimalToDouble(Vector& source, Vector& result, idx_t count) {
        auto scale = DecimalType::GetScale(source.GetType());
        auto factor = std::pow(10.0, -static_cast<double>(scale));
        UnifiedVectorFormat format;
        source.ToUnifiedFormat(count, format);
        auto out = FlatVector::GetDataMutable<double>(result);
        auto& validity = FlatVector::ValidityMutable(result);
        auto unscaled = [&](idx_t idx) -> double {
            switch (source.GetType().InternalType()) {
                case PhysicalType::INT16:
                    return static_cast<double>(UnifiedVectorFormat::GetData<int16_t>(format)[idx]);
                case PhysicalType::INT32:
                    return static_cast<double>(UnifiedVectorFormat::GetData<int32_t>(format)[idx]);
                case PhysicalType::INT64:
                    return static_cast<double>(UnifiedVectorFormat::GetData<int64_t>(format)[idx]);
                case PhysicalType::INT128:
                    return Hugeint::Cast<double>(UnifiedVectorFormat::GetData<hugeint_t>(format)[idx]);
                default:
                    throw InternalException("Unexpected physical type of a decimal");
            }
        };
        for (idx_t row = 0; row < count; row++) {
            auto idx = format.sel->get_index(row);
            if (!format.validity.RowIsValid(idx)) {
                validity.SetInvalid(row);
                continue;
            }
            out[row] = unscaled(idx) * factor;
        }
    }

    /// Write the dictionary batches of an array view, assigning ids in the order of the schema
    web::Status WriteDictionaries(const ArrowArrayView& view, int64_t& next_dictionary_id) {
        if (view.dictionary) {
            ArrowError error{};
            auto dictionary_id = next_dictionary_id++;
            WEB_RETURN_NOT_OK(NanoarrowStatus(
                ArrowIpcWriterWriteDictionaryBatch(writer.get(), dictionary_id, 0, view.dictionary, &error), error,
                "dictionary batch"));
        }
        for (int64_t i = 0; i < view.n_children; i++) {
            WEB_RETURN_NOT_OK(WriteDictionaries(*view.children[i], next_dictionary_id));
        }
        if (view.dictionary) {
            WEB_RETURN_NOT_OK(WriteDictionaries(*view.dictionary, next_dictionary_id));
        }
        return web::Status::OK();
    }
};

ArrowIPCWriter::ArrowIPCWriter(ClientContext& context, vector<LogicalType> types, vector<string> names,
                               const QueryConfig& config, bool lossless_conversion)
    : impl_(std::make_unique<Impl>(context, std::move(types), std::move(names), config, lossless_conversion)) {}

ArrowIPCWriter::~ArrowIPCWriter() = default;

web::Result<std::shared_ptr<web::Buffer>> ArrowIPCWriter::SerializeSchema() {
    WEB_RETURN_NOT_OK(impl_->InitWriter());
    WEB_RETURN_NOT_OK(impl_->WriteSchema());
    return impl_->TakeBuffer();
}

web::Result<std::shared_ptr<web::Buffer>> ArrowIPCWriter::SerializeChunk(DataChunk& chunk) {
    if (!impl_->schema_written) {
        return web::Status::Invalid("The schema has to be serialized before the record batches");
    }
    WEB_RETURN_NOT_OK(impl_->WriteChunk(chunk));
    return impl_->TakeBuffer();
}

web::Result<std::shared_ptr<web::Buffer>> ArrowIPCWriter::SerializeResult(QueryResult& result) {
    // The IPC stream format: nanoarrow's file format holds a single dictionary batch, enums need one each
    WEB_RETURN_NOT_OK(impl_->InitWriter());
    ArrowError error{};
    WEB_RETURN_NOT_OK(impl_->WriteSchema());
    for (auto chunk = result.Fetch(); !!chunk && chunk->size() > 0; chunk = result.Fetch()) {
        if (result.HasError()) {
            return web::Status::ExecutionError(result.GetError());
        }
        WEB_RETURN_NOT_OK(impl_->WriteChunk(*chunk));
    }
    // End of stream
    WEB_RETURN_NOT_OK(
        NanoarrowStatus(ArrowIpcWriterWriteArrayView(impl_->writer.get(), nullptr, &error), error, "end of stream"));
    return impl_->TakeBuffer();
}

}  // namespace web
}  // namespace duckdb
