#define RAPIDJSON_HAS_STDSTRING 1

#include "duckdb/web/webdb.h"

#include <chrono>
#include <cstddef>
#include <cstdio>
#include <functional>
#include <limits>
#include <memory>
#include <optional>
#include <stdexcept>
#include <string_view>
#include <unordered_map>

#include "arrow/array/array_dict.h"
#include "arrow/array/array_nested.h"
#include "arrow/array/builder_primitive.h"
#include "arrow/buffer.h"
#include "arrow/io/memory.h"
#include "arrow/ipc/options.h"
#include "arrow/ipc/reader.h"
#include "arrow/ipc/type_fwd.h"
#include "arrow/ipc/writer.h"
#include "arrow/record_batch.h"
#include "arrow/result.h"
#include "arrow/status.h"
#include "arrow/type_fwd.h"
#include "duckdb.hpp"
#include "duckdb/common/arrow/arrow.hpp"
#include "duckdb/common/arrow/arrow_converter.hpp"
#include "duckdb/common/file_system.hpp"
#include "duckdb/common/types.hpp"
#include "duckdb/common/types/data_chunk.hpp"
#include "duckdb/common/types/vector.hpp"
#include "duckdb/common/types/vector_buffer.hpp"
#include "duckdb/main/query_result.hpp"
#include "duckdb/parser/expression/constant_expression.hpp"
#include "duckdb/parser/parser.hpp"
#include "duckdb/web/arrow_bridge.h"
#include "duckdb/web/arrow_casts.h"
#include "duckdb/web/arrow_insert_options.h"
#include "duckdb/web/arrow_stream_buffer.h"
#include "duckdb/web/arrow_type_mapping.h"
#include "duckdb/web/config.h"
#include "duckdb/web/csv_insert_options.h"
#include "duckdb/web/environment.h"
#include "duckdb/web/extensions/fts_extension.h"
#include "duckdb/web/extensions/json_extension.h"
#include "duckdb/web/extensions/parquet_extension.h"
#include "duckdb/web/functions/table_function_relation.h"
#include "duckdb/web/io/arrow_ifstream.h"
#include "duckdb/web/io/buffered_filesystem.h"
#include "duckdb/web/io/file_page_buffer.h"
#include "duckdb/web/io/ifstream.h"
#include "duckdb/web/io/web_filesystem.h"
#include "duckdb/web/json_analyzer.h"
#include "duckdb/web/json_dataview.h"
#include "duckdb/web/json_insert_options.h"
#include "duckdb/web/json_table.h"
#include "duckdb/web/udf.h"
#include "duckdb/web/utils/debug.h"
#include "duckdb/web/utils/wasm_response.h"
#include "rapidjson/document.h"
#include "rapidjson/error/en.h"
#include "rapidjson/rapidjson.h"
#include "rapidjson/stringbuffer.h"
#include "rapidjson/writer.h"

namespace duckdb {
namespace web {

static constexpr int64_t DEFAULT_QUERY_POLLING_INTERVAL = 100;

/// Create the default webdb database
duckdb::unique_ptr<WebDB> WebDB::Create() {
    if constexpr (ENVIRONMENT == Environment::WEB) {
        return duckdb::make_uniq<WebDB>(WEB);
    } else {
        auto fs = duckdb::FileSystem::CreateLocal();
        return duckdb::make_uniq<WebDB>(NATIVE, std::move(fs));
    }
}
/// Get the static webdb instance
arrow::Result<std::reference_wrapper<WebDB>> WebDB::Get() {
    static duckdb::unique_ptr<WebDB> db = nullptr;
    if (db == nullptr) {
        db = Create();
    }
    return *db;
}

/// Constructor
WebDB::Connection::Connection(WebDB& webdb)
    : webdb_(webdb), connection_(*webdb.database_), arrow_ipc_stream_(nullptr) {}
/// Constructor
WebDB::Connection::~Connection() = default;

arrow::Result<std::shared_ptr<arrow::Buffer>> WebDB::Connection::MaterializeQueryResult(
    duckdb::unique_ptr<duckdb::QueryResult> result) {
    current_query_result_.reset();
    current_schema_.reset();
    current_schema_patched_.reset();

    // Configure the output writer
    ArrowSchema raw_schema;
    ClientProperties options;
    options.arrow_offset_size = ArrowOffsetSize::REGULAR;
    ArrowConverter::ToArrowSchema(&raw_schema, result->types, result->names, options);
    ARROW_ASSIGN_OR_RAISE(auto schema, arrow::ImportSchema(&raw_schema));

    // Patch the schema (if necessary)
    std::shared_ptr<arrow::Schema> patched_schema = patchSchema(schema, webdb_.config_->query);
    // Create the file writer
    ARROW_ASSIGN_OR_RAISE(auto out, arrow::io::BufferOutputStream::Create());
    ARROW_ASSIGN_OR_RAISE(auto writer, arrow::ipc::MakeFileWriter(out, patched_schema));

    // Write chunk stream
    for (auto chunk = result->Fetch(); !!chunk && chunk->size() > 0; chunk = result->Fetch()) {
        // Import the data chunk as record batch
        ArrowArray array;
        ArrowConverter::ToArrowArray(*chunk, &array, options);
        // Import the record batch
        ARROW_ASSIGN_OR_RAISE(auto batch, arrow::ImportRecordBatch(&array, schema));
        // Patch the record batch
        ARROW_ASSIGN_OR_RAISE(batch, patchRecordBatch(batch, patched_schema, webdb_.config_->query));
        // Write the record batch
        ARROW_RETURN_NOT_OK(writer->WriteRecordBatch(*batch));
    }
    ARROW_RETURN_NOT_OK(writer->Close());
    return out->Finish();
}

arrow::Result<std::shared_ptr<arrow::Buffer>> WebDB::Connection::StreamQueryResult(
    duckdb::unique_ptr<duckdb::QueryResult> result) {
    current_query_result_ = std::move(result);
    current_schema_.reset();
    current_schema_patched_.reset();

    // Import the schema
    ArrowSchema raw_schema;
    ClientProperties options;
    options.arrow_offset_size = ArrowOffsetSize::REGULAR;
    ArrowConverter::ToArrowSchema(&raw_schema, current_query_result_->types, current_query_result_->names, options);
    ARROW_ASSIGN_OR_RAISE(current_schema_, arrow::ImportSchema(&raw_schema));
    current_schema_patched_ = patchSchema(current_schema_, webdb_.config_->query);

    // Serialize the schema
    return arrow::ipc::SerializeSchema(*current_schema_patched_);
}

arrow::Result<std::shared_ptr<arrow::Buffer>> WebDB::Connection::RunQuery(std::string_view text) {
    try {
        // Send the query
        auto result = connection_.SendQuery(std::string{text});
        if (result->HasError()) {
            return arrow::Status{arrow::StatusCode::ExecutionError, std::move(result->GetError())};
        }
        return MaterializeQueryResult(std::move(result));
    } catch (std::exception& e) {
        return arrow::Status{arrow::StatusCode::ExecutionError, e.what()};
    } catch (...) {
        return arrow::Status{arrow::StatusCode::ExecutionError, "unknown exception"};
    }
}

arrow::Result<std::shared_ptr<arrow::Buffer>> WebDB::Connection::PendingQuery(std::string_view text) {
    try {
        // Send the query
        auto result = connection_.PendingQuery(std::string{text});
        if (result->HasError()) return arrow::Status{arrow::StatusCode::ExecutionError, std::move(result->GetError())};
        current_pending_query_result_ = std::move(result);
        current_pending_query_was_canceled_ = false;
        current_query_result_.reset();
        current_schema_.reset();
        current_schema_patched_.reset();
        if (webdb_.config_->query.query_polling_interval.value_or(DEFAULT_QUERY_POLLING_INTERVAL) > 0) {
            return PollPendingQuery();
        } else {
            return nullptr;
        }
    } catch (std::exception& e) {
        return arrow::Status{arrow::StatusCode::ExecutionError, e.what()};
    } catch (...) {
        return arrow::Status{arrow::StatusCode::ExecutionError, "unknown exception"};
    }
}

arrow::Result<std::shared_ptr<arrow::Buffer>> WebDB::Connection::PollPendingQuery() {
    if (current_pending_query_was_canceled_) {
        return arrow::Status{arrow::StatusCode::ExecutionError, "query was canceled"};
    } else if (current_pending_query_result_ == nullptr) {
        return arrow::Status{arrow::StatusCode::ExecutionError, "no active pending query"};
    }
    auto before = std::chrono::steady_clock::now();
    uint64_t elapsed;
    auto polling_interval = webdb_.config_->query.query_polling_interval.value_or(DEFAULT_QUERY_POLLING_INTERVAL);
    do {
        switch (current_pending_query_result_->ExecuteTask()) {
            case PendingExecutionResult::EXECUTION_FINISHED:
            case PendingExecutionResult::RESULT_READY:
                return StreamQueryResult(current_pending_query_result_->Execute());
            case PendingExecutionResult::BLOCKED:
            case PendingExecutionResult::NO_TASKS_AVAILABLE:
                return nullptr;
            case PendingExecutionResult::RESULT_NOT_READY:
                break;
            case PendingExecutionResult::EXECUTION_ERROR: {
                auto err = current_pending_query_result_->GetError();
                current_pending_query_result_.reset();
                return arrow::Status{arrow::StatusCode::ExecutionError, err};
            }
        }
        auto after = std::chrono::steady_clock::now();
        elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(after - before).count();
    } while (elapsed < polling_interval);
    return nullptr;
}

bool WebDB::Connection::CancelPendingQuery() {
    // Only reset the pending query if it hasn't completed yet
    if (current_pending_query_result_ != nullptr && current_query_result_ == nullptr) {
        current_pending_query_was_canceled_ = true;
        current_pending_query_result_.reset();
        return true;
    } else {
        return false;
    }
}

arrow::Result<std::shared_ptr<arrow::Buffer>> WebDB::Connection::FetchQueryResults() {
    try {
        // Fetch data if a query is active
        duckdb::unique_ptr<duckdb::DataChunk> chunk;
        if (current_query_result_ == nullptr) {
            return nullptr;
        }
        // Fetch next result chunk
        chunk = current_query_result_->Fetch();
        if (current_query_result_->HasError()) {
            return arrow::Status{arrow::StatusCode::ExecutionError, std::move(current_query_result_->GetError())};
        }
        // Reached end?
        if (!chunk) {
            current_query_result_.reset();
            current_schema_.reset();
            current_schema_patched_.reset();
            return nullptr;
        }

        // Serialize the record batch
        ArrowArray array;
        ClientProperties arrow_options;
        arrow_options.arrow_offset_size = ArrowOffsetSize::REGULAR;
        ArrowConverter::ToArrowArray(*chunk, &array, arrow_options);
        ARROW_ASSIGN_OR_RAISE(auto batch, arrow::ImportRecordBatch(&array, current_schema_));
        // Patch the record batch
        ARROW_ASSIGN_OR_RAISE(batch, patchRecordBatch(batch, current_schema_patched_, webdb_.config_->query));
        // Serialize the record batch
        auto options = arrow::ipc::IpcWriteOptions::Defaults();
        options.use_threads = false;
        return arrow::ipc::SerializeRecordBatch(*batch, options);
    } catch (std::exception& e) {
        return arrow::Status{arrow::StatusCode::ExecutionError, e.what()};
    }
}
/// Fetch table names
arrow::Result<std::string> WebDB::Connection::GetTableNames(std::string_view text) {
    try {
        rapidjson::Document doc;
        auto table_name_set = connection_.GetTableNames(std::string{text});
        std::vector<std::string> table_names{table_name_set.begin(), table_name_set.end()};
        std::sort(table_names.begin(), table_names.end());
        auto& array = doc.SetArray();
        auto& alloc = doc.GetAllocator();
        for (auto& name : table_names) {
            array.PushBack(rapidjson::StringRef(name.data(), name.length()), alloc);
        }
        rapidjson::StringBuffer strbuf;
        rapidjson::Writer<rapidjson::StringBuffer> writer{strbuf};
        doc.Accept(writer);
        return strbuf.GetString();
    } catch (std::exception& e) {
        return arrow::Status{arrow::StatusCode::ExecutionError, e.what()};
    }
}

arrow::Result<size_t> WebDB::Connection::CreatePreparedStatement(std::string_view text) {
    try {
        auto prep = connection_.Prepare(std::string{text});
        if (prep->HasError()) return arrow::Status{arrow::StatusCode::ExecutionError, prep->GetError()};
        auto id = next_prepared_statement_id_++;

        // Wrap around if maximum exceeded
        if (next_prepared_statement_id_ == std::numeric_limits<size_t>::max()) next_prepared_statement_id_ = 0;

        prepared_statements_.emplace(id, std::move(prep));
        return id;
    } catch (std::exception& e) {
        return arrow::Status{arrow::StatusCode::ExecutionError, e.what()};
    }
}

arrow::Result<duckdb::unique_ptr<duckdb::QueryResult>> WebDB::Connection::ExecutePreparedStatement(
    size_t statement_id, std::string_view args_json) {
    try {
        auto stmt = prepared_statements_.find(statement_id);
        if (stmt == prepared_statements_.end())
            return arrow::Status{arrow::StatusCode::KeyError, "No prepared statement found with ID"};

        rapidjson::Document args_doc;
        rapidjson::ParseResult ok = args_doc.Parse(args_json.begin(), args_json.size());
        if (!ok) return arrow::Status{arrow::StatusCode::Invalid, rapidjson::GetParseError_En(ok.Code())};
        if (!args_doc.IsArray()) return arrow::Status{arrow::StatusCode::Invalid, "Arguments must be given as array"};

        duckdb::vector<duckdb::Value> values;
        size_t index = 0;
        for (const auto& v : args_doc.GetArray()) {
            if (v.IsLosslessDouble())
                values.emplace_back(v.GetDouble());
            else if (v.IsString())
                // Use GetStringLenght otherwise null bytes will be counted as terminators
                values.emplace_back(string_t(v.GetString(), v.GetStringLength()));
            else if (v.IsNull())
                values.emplace_back(nullptr);
            else if (v.IsBool())
                values.emplace_back(v.GetBool());
            else
                return arrow::Status{arrow::StatusCode::Invalid,
                                     "Invalid column type encountered for argument " + std::to_string(index)};
            ++index;
        }

        auto result = stmt->second->Execute(values);
        if (result->HasError()) return arrow::Status{arrow::StatusCode::ExecutionError, std::move(result->GetError())};
        return result;
    } catch (std::exception& e) {
        return arrow::Status{arrow::StatusCode::ExecutionError, e.what()};
    }
}

arrow::Result<std::shared_ptr<arrow::Buffer>> WebDB::Connection::RunPreparedStatement(size_t statement_id,
                                                                                      std::string_view args_json) {
    auto result = ExecutePreparedStatement(statement_id, args_json);
    if (!result.ok()) return result.status();
    return MaterializeQueryResult(std::move(*result));
}

arrow::Result<std::shared_ptr<arrow::Buffer>> WebDB::Connection::SendPreparedStatement(size_t statement_id,
                                                                                       std::string_view args_json) {
    auto result = ExecutePreparedStatement(statement_id, args_json);
    if (!result.ok()) return result.status();
    return StreamQueryResult(std::move(*result));
}

arrow::Status WebDB::Connection::ClosePreparedStatement(size_t statement_id) {
    auto it = prepared_statements_.find(statement_id);
    if (it == prepared_statements_.end())
        return arrow::Status{arrow::StatusCode::KeyError, "No prepared statement found with ID"};
    prepared_statements_.erase(it);
    return arrow::Status::OK();
}

arrow::Status WebDB::Connection::CreateScalarFunction(std::string_view def_json) {
    // Read the function definiton
    rapidjson::Document def_doc;
    def_doc.Parse(def_json.begin(), def_json.size());
    auto def = duckdb::make_shared_ptr<UDFFunctionDeclaration>();
    ARROW_RETURN_NOT_OK(def->ReadFrom(def_doc));

    // Read return type
    auto name = def->name;
    ARROW_ASSIGN_OR_RAISE(auto ret_type, mapArrowTypeToDuckDB(*def->return_type));

    // UDF lambda
    auto udf = [&, udf = std::move(def)](DataChunk& chunk, ExpressionState& state, Vector& vec) {
        auto status = CallScalarUDFFunction(*udf, chunk, state, vec);
        if (!status.ok()) {
            throw std::runtime_error(status.message());
        }
    };

    // Register the vectorized function
    connection_.CreateVectorizedFunction(name, vector<LogicalType>{}, ret_type, udf, LogicalType::ANY);
    return arrow::Status::OK();
}

#ifndef EMSCRIPTEN
void duckdb_web_udf_scalar_call(WASMResponse*, size_t, const void*, size_t, const void*, size_t) {}
#else
extern "C" void duckdb_web_udf_scalar_call(WASMResponse* response, size_t function_id, const void* desc_buf,
                                           size_t desc_size, const void* ptrs_buf, size_t ptrs_size);
#endif

namespace {

class SharedVectorBuffer : public VectorBuffer {
   protected:
    std::unique_ptr<char[]> data;

   public:
    explicit SharedVectorBuffer(std::unique_ptr<char[]> data)
        : VectorBuffer(VectorBufferType::STANDARD_BUFFER), data(std::move(data)) {}
};

}  // namespace

typedef vector<unique_ptr<data_t[]>> additional_buffers_t;

static data_ptr_t create_additional_buffer(vector<double>& data_ptrs, additional_buffers_t& additional_buffers,
                                           idx_t size, int64_t& buffer_idx) {
    additional_buffers.emplace_back(unique_ptr<data_t[]>(new data_t[size]));
    auto res_ptr = additional_buffers.back().get();
    data_ptrs.push_back(static_cast<double>(reinterpret_cast<uintptr_t>(res_ptr)));
    buffer_idx = data_ptrs.size() - 1;
    return res_ptr;
}

// this talks to udf_runtime.ts, changes need to be mirrored there
arrow::Status WebDB::Connection::CallScalarUDFFunction(UDFFunctionDeclaration& function, DataChunk& chunk,
                                                       ExpressionState& state, Vector& out) {
    auto data_size = chunk.size();
    vector<string> type_desc;

    // Normalify the data chunk - # TODO use UnifiedFormat
    chunk.Flatten();
    out.Flatten(chunk.size());

    // TODO create the descriptor in the bind phase for performance
    // TODO special handling if all arguments are non-NULL for performance
    additional_buffers_t additional_buffers;
    vector<double> data_ptrs;
    rapidjson::Document desc_doc;
    {
        auto json_alloc = desc_doc.GetAllocator();
        ARROW_ASSIGN_OR_RAISE(auto args, json::CreateDataView(desc_doc, chunk, data_ptrs, additional_buffers));
        desc_doc.SetObject().AddMember("args", args, desc_doc.GetAllocator());
        desc_doc.AddMember("rows", chunk.size(), json_alloc);
        rapidjson::Value ret{rapidjson::kObjectType};
        ret.AddMember("sqlType", rapidjson::Value{out.GetType().ToString(), json_alloc}, json_alloc);
        ret.AddMember("physicalType", rapidjson::Value{TypeIdToString(out.GetType().InternalType()), json_alloc},
                      json_alloc);
        desc_doc.AddMember("ret", ret, json_alloc);
    }

    rapidjson::StringBuffer desc_buffer;
    rapidjson::Writer desc_writer{desc_buffer};
    desc_doc.Accept(desc_writer);

    // actually call the UDF
    WASMResponse response;
    duckdb_web_udf_scalar_call(&response, function.function_id, desc_buffer.GetString(), desc_buffer.GetLength(),
                               data_ptrs.data(), data_ptrs.size() * sizeof(uint64_t));
    // UDF call failed?
    if (response.statusCode != 0) {
        uintptr_t err_ptr = response.dataOrValue;
        std::unique_ptr<char[]> err_buf{reinterpret_cast<char*>(err_ptr)};
        std::string err{err_buf.get(), static_cast<size_t>(response.dataSize)};
        return arrow::Status::ExecutionError(err);
    }

    // Unpack result buffer, first entry is data, second is validity, third is length (strings/lists)
    auto res_arr = reinterpret_cast<double*>(static_cast<uintptr_t>(response.dataOrValue));
    auto validity_arr =
        reinterpret_cast<uint8_t*>(static_cast<uintptr_t>(res_arr[1]));  // TODO WTF why is this 2 and not 1?
    for (idx_t row_idx = 0; row_idx < chunk.size(); row_idx++) {
        FlatVector::SetNull(out, row_idx, !validity_arr[row_idx]);
    }

    // Special handling for strings, we need to interpret the funky pointers and the lengths
    // basically inverse of what happens above for strings
    if (out.GetType().id() == LogicalTypeId::VARCHAR) {
        auto string_ptr_buf = reinterpret_cast<double*>(static_cast<uintptr_t>(res_arr[0]));
        auto out_string_ptr = FlatVector::GetData<string_t>(out);
        auto len_buf = reinterpret_cast<double*>(static_cast<uintptr_t>(res_arr[2]));
        for (idx_t row_idx = 0; row_idx < chunk.size(); row_idx++) {
            if (!validity_arr[row_idx]) {
                continue;
            }
            auto string_ptr = reinterpret_cast<const char*>(static_cast<uintptr_t>(string_ptr_buf[row_idx]));
            out_string_ptr[row_idx] = StringVector::AddString(out, string_ptr, len_buf[row_idx]);
        }

    } else {
        auto res_buf = reinterpret_cast<char*>(static_cast<uintptr_t>(res_arr[0]));
        auto shared_buffer = duckdb::make_shared_ptr<SharedVectorBuffer>(std::unique_ptr<char[]>{res_buf});
        out.SetAuxiliary(shared_buffer);
        duckdb::FlatVector::SetData(out, (data_ptr_t)res_buf);
    }

    free(validity_arr);
    free(res_arr);
    return arrow::Status::OK();
}

/// Insert a record batch
arrow::Status WebDB::Connection::InsertArrowFromIPCStream(nonstd::span<const uint8_t> stream,
                                                          std::string_view options_json) {
    try {
        // First call?
        if (!arrow_ipc_stream_) {
            arrow_insert_options_.reset();

            /// Read table options.
            /// We deliberately do this BEFORE creating the ipc stream.
            /// This ensures that we always have valid options.
            rapidjson::Document options_doc;
            options_doc.Parse(options_json.begin(), options_json.size());
            ArrowInsertOptions options;
            ARROW_RETURN_NOT_OK(options.ReadFrom(options_doc));
            arrow_insert_options_ = options;

            // Create the IPC stream
            arrow_ipc_stream_ = std::make_unique<BufferingArrowIPCStreamDecoder>();
        }

        /// Consume stream bytes
        ARROW_RETURN_NOT_OK(arrow_ipc_stream_->Consume(stream.data(), stream.size()));
        if (!arrow_ipc_stream_->buffer()->is_eos()) {
            return arrow::Status::OK();
        }
        assert(arrow_insert_options_);

        /// Execute the arrow scan
        vector<Value> params;
        params.push_back(duckdb::Value::POINTER(reinterpret_cast<uintptr_t>(&arrow_ipc_stream_->buffer())));
        params.push_back(
            duckdb::Value::POINTER(reinterpret_cast<uintptr_t>(&ArrowIPCStreamBufferReader::CreateStream)));
        params.push_back(duckdb::Value::POINTER(reinterpret_cast<uintptr_t>(&ArrowIPCStreamBufferReader::GetSchema)));
        auto func = connection_.TableFunction("arrow_scan", params);

        /// Create or insert
        if (arrow_insert_options_->create_new) {
            func->Create(arrow_insert_options_->schema_name, arrow_insert_options_->table_name);
        } else {
            func->Insert(arrow_insert_options_->schema_name, arrow_insert_options_->table_name);
        }

        // Reset the ipc stream
        arrow_insert_options_.reset();
        arrow_ipc_stream_.reset();
    } catch (const std::exception& e) {
        arrow_insert_options_.reset();
        arrow_ipc_stream_.reset();
        return arrow::Status::UnknownError(e.what());
    }
    return arrow::Status::OK();
}
/// Import a csv file
arrow::Status WebDB::Connection::InsertCSVFromPath(std::string_view path, std::string_view options_json) {
    try {
        /// Read table options
        rapidjson::Document options_doc;
        options_doc.Parse(options_json.begin(), options_json.size());
        csv::CSVInsertOptions options;
        ARROW_RETURN_NOT_OK(options.ReadFrom(options_doc));

        /// Get table name and schema
        auto schema_name = options.schema_name.empty() ? "main" : options.schema_name;
        if (options.table_name.empty()) return arrow::Status::Invalid("missing 'name' option");

        // Pack the unnamed parameters
        std::vector<Value> unnamed_params;
        unnamed_params.emplace_back(std::string{path});

        // Pack the named parameters
        std::unordered_map<std::string, Value> named_params;
        if (options.header.has_value()) {
            named_params.insert({"header", Value::BOOLEAN(*options.header)});
        }
        if (options.delimiter.has_value()) {
            named_params.insert({"delim", Value(*options.delimiter)});
        }
        if (options.escape.has_value()) {
            named_params.insert({"escape", Value(*options.escape)});
        }
        if (options.quote.has_value()) {
            named_params.insert({"quote", Value(*options.quote)});
        }
        if (options.skip.has_value()) {
            named_params.insert({"skip", Value::INTEGER(*options.skip)});
        }
        if (options.dateformat.has_value()) {
            named_params.insert({"dateformat", Value(*options.dateformat)});
        }
        if (options.timestampformat.has_value()) {
            named_params.insert({"timestampformat", Value(*options.timestampformat)});
        }
        if (options.columns.has_value()) {
            child_list_t<Value> columns;
            columns.reserve(options.columns.value().size());
            for (auto& col : options.columns.value()) {
                ARROW_ASSIGN_OR_RAISE(auto type, mapArrowTypeToDuckDB(*col->type()));
                columns.push_back(make_pair(col->name(), Value(type.ToString())));
            }
            named_params.insert({"columns", Value::STRUCT(std::move(columns))});
        }
        named_params.insert({"auto_detect", Value::BOOLEAN(options.auto_detect.value_or(true))});

        /// Execute the csv scan
        auto func = duckdb::make_shared_ptr<TableFunctionRelation>(connection_.context, "read_csv",
                                                                   std::move(unnamed_params), named_params);

        /// Create or insert
        if (options.create_new) {
            func->Create(options.schema_name, options.table_name);
        } else {
            func->Insert(options.schema_name, options.table_name);
        }

    } catch (const std::exception& e) {
        return arrow::Status::UnknownError(e.what());
    }
    return arrow::Status::OK();
}

/// Import a json file
arrow::Status WebDB::Connection::InsertJSONFromPath(std::string_view path, std::string_view options_json) {
    try {
        /// Read table options
        rapidjson::Document options_doc;
        options_doc.Parse(options_json.begin(), options_json.size());
        json::JSONInsertOptions options;
        ARROW_RETURN_NOT_OK(options.ReadFrom(options_doc));

        /// Get table name and schema
        auto schema_name = options.schema_name.empty() ? "main" : options.schema_name;
        if (options.table_name.empty()) return arrow::Status::Invalid("missing 'name' option");

        // Create the input file stream
        auto ifs = duckdb::make_uniq<io::InputFileStream>(webdb_.file_page_buffer_, path);
        // Do we need to run the analyzer?
        json::TableType table_type;
        if (!options.table_shape || options.table_shape == json::JSONTableShape::UNRECOGNIZED ||
            options.auto_detect.value_or(false)) {
            io::InputFileStream ifs_copy{*ifs};
            ARROW_RETURN_NOT_OK(json::InferTableType(ifs_copy, table_type));

        } else {
            table_type.shape = *options.table_shape;
            table_type.type = arrow::struct_(options.columns.value_or(std::vector<std::shared_ptr<arrow::Field>>{}));
        }
        // Resolve the table reader
        ARROW_ASSIGN_OR_RAISE(auto table_reader, json::TableReader::Resolve(std::move(ifs), table_type));

        /// Execute the arrow scan
        vector<Value> params;
        params.push_back(duckdb::Value::POINTER(reinterpret_cast<uintptr_t>(&table_reader)));
        params.push_back(duckdb::Value::POINTER(reinterpret_cast<uintptr_t>(json::TableReader::CreateStream)));
        params.push_back(duckdb::Value::POINTER(reinterpret_cast<uintptr_t>(json::TableReader::GetSchema)));
        auto func = connection_.TableFunction("arrow_scan", params);

        /// Create or insert
        if (options.create_new) {
            func->Create(schema_name, options.table_name);
        } else {
            func->Insert(schema_name, options.table_name);
        }

    } catch (const std::exception& e) {
        return arrow::Status::UnknownError(e.what());
    }
    return arrow::Status::OK();
}

// Register custom extension options in DuckDB for options that are handled in DuckDB-WASM instead of DuckDB
void WebDB::RegisterCustomExtensionOptions(shared_ptr<duckdb::DuckDB> database) {
    DEBUG_TRACE();
    // Fetch the config to enable the custom SET parameters
    auto& config = duckdb::DBConfig::GetConfig(*database->instance);
    auto webfs = io::WebFileSystem::Get();

    // Register S3 Config parameters
    if (webfs) {
        auto callback_s3_region = [](ClientContext& context, SetScope scope, Value& parameter) {
            auto webfs = io::WebFileSystem::Get();
            webfs->Config()->duckdb_config_options.s3_region = StringValue::Get(parameter);
            webfs->IncrementCacheEpoch();
        };
        auto callback_s3_access_key_id = [](ClientContext& context, SetScope scope, Value& parameter) {
            auto webfs = io::WebFileSystem::Get();
            webfs->Config()->duckdb_config_options.s3_access_key_id = StringValue::Get(parameter);
            webfs->IncrementCacheEpoch();
        };
        auto callback_s3_secret_access_key = [](ClientContext& context, SetScope scope, Value& parameter) {
            auto webfs = io::WebFileSystem::Get();
            webfs->Config()->duckdb_config_options.s3_secret_access_key = StringValue::Get(parameter);
            webfs->IncrementCacheEpoch();
        };
        auto callback_s3_session_token = [](ClientContext& context, SetScope scope, Value& parameter) {
            auto webfs = io::WebFileSystem::Get();
            webfs->Config()->duckdb_config_options.s3_session_token = StringValue::Get(parameter);
            webfs->IncrementCacheEpoch();
        };
        auto callback_s3_endpoint = [](ClientContext& context, SetScope scope, Value& parameter) {
            auto webfs = io::WebFileSystem::Get();
            webfs->Config()->duckdb_config_options.s3_endpoint = StringValue::Get(parameter);
            webfs->IncrementCacheEpoch();
        };
        auto callback_reliable_head_requests = [](ClientContext& context, SetScope scope, Value& parameter) {
            auto webfs = io::WebFileSystem::Get();
            webfs->Config()->duckdb_config_options.reliable_head_requests = BooleanValue::Get(parameter);
            webfs->IncrementCacheEpoch();
        };

        config.AddExtensionOption("s3_region", "S3 Region", LogicalType::VARCHAR, Value(), callback_s3_region);
        config.AddExtensionOption("s3_access_key_id", "S3 Access Key ID", LogicalType::VARCHAR, Value(),
                                  callback_s3_access_key_id);
        config.AddExtensionOption("s3_secret_access_key", "S3 Access Key", LogicalType::VARCHAR, Value(),
                                  callback_s3_secret_access_key);
        config.AddExtensionOption("s3_session_token", "S3 Session Token", LogicalType::VARCHAR, Value(),
                                  callback_s3_session_token);
        config.AddExtensionOption("s3_endpoint", "S3 Endpoint (default s3.amazonaws.com)", LogicalType::VARCHAR,
                                  Value(), callback_s3_endpoint);
        config.AddExtensionOption("reliable_head_requests", "Set whether HEAD requests returns reliable content-length",
                                  LogicalType::BOOLEAN, Value(true), callback_reliable_head_requests);

        webfs->IncrementCacheEpoch();
    }
}

/// Constructor
WebDB::WebDB(WebTag)
    : config_(std::make_shared<WebDBConfig>()),
      file_page_buffer_(nullptr),
      buffered_filesystem_(nullptr),
      database_(nullptr),
      connections_(),
      file_stats_(std::make_shared<io::FileStatisticsRegistry>()),
      pinned_web_files_() {
    auto webfs = std::make_shared<io::WebFileSystem>(config_);
    webfs->ConfigureFileStatistics(file_stats_);
    file_page_buffer_ = std::make_shared<io::FilePageBuffer>(std::move(webfs));
    file_page_buffer_->ConfigureFileStatistics(file_stats_);
    if (auto open_status = Open(); !open_status.ok()) {
        throw std::runtime_error(open_status.message());
    }
}

/// Constructor
WebDB::WebDB(NativeTag, duckdb::unique_ptr<duckdb::FileSystem> fs)
    : config_(std::make_shared<WebDBConfig>()),
      file_page_buffer_(std::make_shared<io::FilePageBuffer>(std::move(fs))),
      buffered_filesystem_(nullptr),
      database_(nullptr),
      connections_(),
      file_stats_(std::make_shared<io::FileStatisticsRegistry>()),
      pinned_web_files_() {
    file_page_buffer_->ConfigureFileStatistics(file_stats_);
    if (auto open_status = Open(); !open_status.ok()) {
        throw std::runtime_error(open_status.message());
    }
}

WebDB::~WebDB() { pinned_web_files_.clear(); }

/// Tokenize a script and return tokens as json
std::string WebDB::Tokenize(std::string_view text) {
    // Tokenize the text
    duckdb::Parser parser;
    auto tokens = parser.Tokenize(std::string{text});
    // Encode the tokens as json
    rapidjson::Document doc;
    doc.SetObject();
    auto& allocator = doc.GetAllocator();
    rapidjson::Value offsets(rapidjson::kArrayType);
    rapidjson::Value types(rapidjson::kArrayType);
    for (auto token : tokens) {
        offsets.PushBack(token.start, allocator);
        types.PushBack(static_cast<uint8_t>(token.type), allocator);
    }
    doc.AddMember("offsets", offsets, allocator);
    doc.AddMember("types", types, allocator);
    // Write the json to a string
    rapidjson::StringBuffer strbuf;
    rapidjson::Writer<rapidjson::StringBuffer> writer{strbuf};
    doc.Accept(writer);
    return strbuf.GetString();
}

/// Get the version
std::string_view WebDB::GetVersion() { return database_->LibraryVersion(); }

/// Create a session
WebDB::Connection* WebDB::Connect() {
    auto conn = duckdb::make_uniq<WebDB::Connection>(*this);
    auto conn_ptr = conn.get();
    connections_.insert({conn_ptr, std::move(conn)});
    return conn_ptr;
}

/// End a session
void WebDB::Disconnect(Connection* session) { connections_.erase(session); }

/// Flush all file buffers
void WebDB::FlushFiles() { file_page_buffer_->FlushFiles(); }
/// Flush file by path
void WebDB::FlushFile(std::string_view path) { file_page_buffer_->FlushFile(path); }

/// Reset the database
arrow::Status WebDB::Reset() {
    DEBUG_TRACE();
    return Open();
}

/// Open a database
arrow::Status WebDB::Open(std::string_view args_json) {
    DEBUG_TRACE();
    assert(config_ != nullptr);
    *config_ = WebDBConfig::ReadFrom(args_json);
    bool in_memory = config_->path == ":memory:" || config_->path == "";
    AccessMode access_mode = in_memory ? AccessMode::AUTOMATIC : AccessMode::READ_ONLY;
    if (config_->access_mode.has_value()) {
        access_mode = static_cast<AccessMode>(config_->access_mode.value());
    }
    try {
        // Setup new database
        auto buffered_fs = buffered_filesystem_ ? duckdb::make_uniq<io::BufferedFileSystem>(*buffered_filesystem_)
                                                : duckdb::make_uniq<io::BufferedFileSystem>(file_page_buffer_);
        auto buffered_fs_ptr = buffered_fs.get();

        duckdb::DBConfig db_config;
        db_config.file_system = std::move(buffered_fs);
        db_config.options.allow_unsigned_extensions = config_->allow_unsigned_extensions;
        db_config.options.maximum_threads = config_->maximum_threads;
        db_config.options.use_temporary_directory = false;
        db_config.options.access_mode = access_mode;
        db_config.options.duckdb_api = "wasm";
        db_config.options.custom_user_agent = config_->custom_user_agent;
        auto db = make_shared_ptr<duckdb::DuckDB>(config_->path, &db_config);
#ifndef WASM_LOADABLE_EXTENSIONS
        duckdb_web_parquet_init(db.get());
        duckdb_web_fts_init(db.get());
#if defined(DUCKDB_JSON_EXTENSION)
        duckdb_web_json_init(db.get());
#endif
#endif  // WASM_LOADABLE_EXTENSIONS
        RegisterCustomExtensionOptions(db);

        // Reset state that is specific to the old database
        connections_.clear();
        database_.reset();
        buffered_filesystem_ = nullptr;

        // Store  new database
        buffered_filesystem_ = buffered_fs_ptr;
        database_ = std::move(db);
    } catch (std::exception& ex) {
        return arrow::Status::Invalid("Opening the database failed with error: ", ex.what());
    } catch (...) {
        return arrow::Status::Invalid("Opening the database failed");
    }
    return arrow::Status::OK();
}
/// Register a file URL
arrow::Status WebDB::RegisterFileURL(std::string_view file_name, std::string_view file_url,
                                     io::WebFileSystem::DataProtocol protocol, bool direct_io) {
    // No web filesystem configured?
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) return arrow::Status::Invalid("WebFileSystem is not configured");
    // Try to drop the file in the buffered file system.
    // If that fails we have to give up since someone still holds an open file ref.
    if (!buffered_filesystem_->TryDropFile(file_name)) {
        return arrow::Status::Invalid("File is already registered and is still buffered");
    }
    // Already pinned by us?
    // Unpin the file to re-register the new file.
    if (auto iter = pinned_web_files_.find(file_name); iter != pinned_web_files_.end()) {
        pinned_web_files_.erase(iter);
    }
    // Register new file url in web filesystem.
    // Pin the file handle to keep the file alive.
    ARROW_ASSIGN_OR_RAISE(auto file_hdl, web_fs->RegisterFileURL(file_name, file_url, protocol));
    pinned_web_files_.insert({file_hdl->GetName(), std::move(file_hdl)});

    // Register new file in buffered filesystem.
    io::BufferedFileSystem::FileConfig file_config = {
        .force_direct_io = direct_io,
    };
    buffered_filesystem_->RegisterFile(file_name, file_config);
    return arrow::Status::OK();
}
/// Register a file URL
arrow::Status WebDB::RegisterFileBuffer(std::string_view file_name, std::unique_ptr<char[]> buffer,
                                        size_t buffer_length) {
    // No web filesystem configured?
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) return arrow::Status::Invalid("WebFileSystem is not configured");
    // Try to drop the file in the buffered file system.
    // If that fails we have to give up since someone still holds an open file ref.
    if (!buffered_filesystem_->TryDropFile(file_name)) {
        return arrow::Status::Invalid("File is already registered and is still buffered");
    }
    // Already pinned by us?
    // Unpin the file to re-register the new file.
    if (auto iter = pinned_web_files_.find(file_name); iter != pinned_web_files_.end()) {
        pinned_web_files_.erase(iter);
    }
    // Register new file in web filesystem
    io::WebFileSystem::DataBuffer data{std::move(buffer), buffer_length};
    ARROW_ASSIGN_OR_RAISE(auto file_hdl, web_fs->RegisterFileBuffer(file_name, std::move(data)));
    // Register new file in buffered filesystem to bypass the paging with direct i/o.
    io::BufferedFileSystem::FileConfig file_config = {
        .force_direct_io = true,
    };
    buffered_filesystem_->RegisterFile(file_name, file_config);
    // Pin the file handle to keep the file alive
    pinned_web_files_.insert({file_hdl->GetName(), std::move(file_hdl)});
    return arrow::Status::OK();
}
/// Drop all files
arrow::Status WebDB::DropFiles() {
    file_page_buffer_->DropDanglingFiles();
    pinned_web_files_.clear();
    if (auto fs = io::WebFileSystem::Get()) {
        fs->DropDanglingFiles();
    }
    return arrow::Status::OK();
}
/// Drop a file
arrow::Status WebDB::DropFile(std::string_view file_name) {
    file_page_buffer_->TryDropFile(file_name);
    pinned_web_files_.erase(file_name);
    if (auto fs = io::WebFileSystem::Get()) {
        if (!fs->TryDropFile(file_name)) {
            return arrow::Status::Invalid("file is in use");
        }
    }
    return arrow::Status::OK();
}
/// Glob all known files
arrow::Result<std::string> WebDB::GlobFileInfos(std::string_view expression) {
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) return arrow::Status::Invalid("WebFileSystem is not configured");
    auto files = web_fs->Glob(std::string{expression});
    auto current_epoch = web_fs->LoadCacheEpoch();

    rapidjson::Document doc;
    doc.SetArray();
    auto& allocator = doc.GetAllocator();
    for (auto& file : files) {
        auto value = web_fs->WriteFileInfo(doc, file, current_epoch - 1);
        if (!value.IsNull()) doc.PushBack(value, allocator);
    }
    rapidjson::StringBuffer strbuf;
    rapidjson::Writer<rapidjson::StringBuffer> writer{strbuf};
    doc.Accept(writer);
    return strbuf.GetString();
}

/// Get the global file info as JSON
arrow::Result<std::string> WebDB::GetGlobalFileInfo(uint32_t cache_epoch) {
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) return arrow::Status::Invalid("WebFileSystem is not configured");

    // Write file info
    rapidjson::Document doc;
    auto value = web_fs->WriteGlobalFileInfo(doc, cache_epoch);
    if (value.IsNull()) {
        return "";
    }

    // Write to string
    rapidjson::StringBuffer strbuf;
    rapidjson::Writer<rapidjson::StringBuffer> writer{strbuf};
    value.Accept(writer);
    return strbuf.GetString();
}

/// Get the file info as JSON
arrow::Result<std::string> WebDB::GetFileInfo(uint32_t file_id, uint32_t cache_epoch) {
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) return arrow::Status::Invalid("WebFileSystem is not configured");

    // Write file info
    rapidjson::Document doc;
    auto value = web_fs->WriteFileInfo(doc, file_id, cache_epoch);
    if (value.IsNull()) {
        return "";
    }

    // Write to string
    rapidjson::StringBuffer strbuf;
    rapidjson::Writer<rapidjson::StringBuffer> writer{strbuf};
    value.Accept(writer);
    return strbuf.GetString();
}
/// Get the file info as JSON
arrow::Result<std::string> WebDB::GetFileInfo(std::string_view file_name, uint32_t cache_epoch) {
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) return arrow::Status::Invalid("WebFileSystem is not configured");

    // Write file info
    rapidjson::Document doc;
    auto value = web_fs->WriteFileInfo(doc, file_name, cache_epoch);
    if (value.IsNull()) {
        return "";
    }

    // Write to string
    rapidjson::StringBuffer strbuf;
    rapidjson::Writer<rapidjson::StringBuffer> writer{strbuf};
    value.Accept(writer);
    return strbuf.GetString();
}
/// Enable file statistics
arrow::Status WebDB::CollectFileStatistics(std::string_view path, bool enable) {
    auto stats = file_stats_->EnableCollector(path, enable);
    if (auto web_fs = io::WebFileSystem::Get()) {
        web_fs->CollectFileStatistics(path, stats);
    }
    file_page_buffer_->CollectFileStatistics(path, std::move(stats));
    return arrow::Status::OK();
}
/// Export file page statistics
arrow::Result<std::shared_ptr<arrow::Buffer>> WebDB::ExportFileStatistics(std::string_view path) {
    return file_stats_->ExportStatistics(path);
}

/// Copy a file to a buffer
arrow::Result<std::shared_ptr<arrow::Buffer>> WebDB::CopyFileToBuffer(std::string_view path) {
    auto& fs = filesystem();
    auto src = fs.OpenFile(std::string{path}, duckdb::FileFlags::FILE_FLAGS_READ);
    auto n = fs.GetFileSize(*src);
    ARROW_ASSIGN_OR_RAISE(auto buffer, arrow::AllocateResizableBuffer(n));

    auto writer = buffer->mutable_data();
    while (n > 0) {
        auto m = fs.Read(*src, writer, n);
        assert(m <= n);
        writer += m;
        if (m == 0) break;
    }

    ARROW_RETURN_NOT_OK(buffer->Resize(writer - buffer->data()));
    return buffer;
}

/// Copy a file to a path
arrow::Status WebDB::CopyFileToPath(std::string_view path, std::string_view out) {
    auto& fs = filesystem();
    auto src = fs.OpenFile(std::string{path}, duckdb::FileFlags::FILE_FLAGS_READ);
    auto dst = fs.OpenFile(std::string{path},
                           duckdb::FileFlags::FILE_FLAGS_WRITE | duckdb::FileFlags::FILE_FLAGS_FILE_CREATE_NEW);

    auto buffer_size = 16 * 1024;
    std::unique_ptr<char[]> buffer{new char[buffer_size]};
    while (true) {
        auto buffered = fs.Read(*src, buffer.get(), buffer_size);
        if (buffered == 0) break;
        while (buffered > 0) {
            auto written = fs.Write(*dst, buffer.get(), buffered);
            assert(written <= buffered);
            buffered -= written;
        }
    }
    fs.FileSync(*dst);

    return arrow::Status::OK();
}

}  // namespace web
}  // namespace duckdb
