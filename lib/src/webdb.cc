#define RAPIDJSON_HAS_STDSTRING 1

#include "duckdb/web/webdb.h"
#include "duckdb/web/status.h"

#include <emscripten/val.h>

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

#include "../../third_party/mbedtls/include/mbedtls_wrapper.hpp"
#include "duckdb.hpp"
#include "duckdb/common/arrow/arrow.hpp"
#include "duckdb/common/arrow/arrow_converter.hpp"
#include "duckdb/common/file_system.hpp"
#include "duckdb/storage/buffer_manager.hpp"
#include "duckdb/common/http_util.hpp"
#include "duckdb/parser/parsed_data/create_scalar_function_info.hpp"
#include "duckdb/function/table/arrow.hpp"
#include "duckdb/main/buffered_data/buffered_data.hpp"
#include "duckdb_static_extension.h"
#include "nanoarrow/nanoarrow.hpp"
#include "nanoarrow/nanoarrow_ipc.hpp"
#include "duckdb/common/types.hpp"
#include "duckdb/common/types/data_chunk.hpp"
#include "duckdb/common/types/vector.hpp"
#include "duckdb/common/types/vector_buffer.hpp"
#include "duckdb/common/virtual_file_system.hpp"
#include "duckdb/function/table/arrow/arrow_duck_schema.hpp"
#include "duckdb/main/query_result.hpp"
#include "duckdb/main/settings.hpp"
#include "duckdb/parser/expression/constant_expression.hpp"
#include "duckdb/parser/parser.hpp"
#include "duckdb/web/arrow_insert_options.h"
#include "duckdb/web/arrow_ipc_writer.h"
#include "duckdb/web/config.h"
#include "duckdb/web/csv_insert_options.h"
#include "duckdb/web/environment.h"
#include "duckdb/web/extension_provider.h"
#include "duckdb/web/extensions/json_extension.h"
#include "duckdb/web/extensions/parquet_extension.h"
#include "duckdb/web/functions/table_function_relation.h"
#include "duckdb/web/http_wasm.h"
#include "duckdb/web/io/buffered_filesystem.h"
#include "duckdb/web/io/remote_filesystem.h"
#include "duckdb/web/io/file_page_buffer.h"
#include "duckdb/web/io/ifstream.h"
#include "duckdb/web/io/web_filesystem.h"
#include "duckdb/web/json_dataview.h"
#include "duckdb/parser/keyword_helper.hpp"
#include "duckdb/web/json_insert_options.h"
#include "duckdb/web/udf.h"
#include "duckdb/web/utils/debug.h"
#include "duckdb/web/utils/wasm_response.h"
#include "rapidjson/document.h"
#include "rapidjson/error/en.h"
#include "rapidjson/rapidjson.h"
#include "rapidjson/stringbuffer.h"
#include "rapidjson/writer.h"

extern "C" int32_t duckdb_extension_core_functions_describe(duckdb_extension_descriptor* descriptor);
extern "C" int32_t duckdb_extension_nanoarrow_describe(duckdb_extension_descriptor* descriptor);
extern "C" int32_t duckdb_extension_httplib_describe(duckdb_extension_descriptor* descriptor);

namespace duckdb {

namespace {
// core_functions and nanoarrow are linked statically, the HTTP client is the httplib capability of this build:
// register them for every database opened afterwards
struct StaticExtensionsInit {
    StaticExtensionsInit() {
        duckdb_register_static_extension(duckdb_extension_core_functions_describe);
        duckdb_register_static_extension(duckdb_extension_nanoarrow_describe);
        duckdb_register_static_extension(duckdb_extension_httplib_describe);
    }
} _static_extensions_init;
}  // namespace

// FIXME: DuckDB used to be patched to consult this in DatabaseInstance::ExtensionIsLoaded("httpfs"),
// after the bump to v2.0 the flag is only tracked here and has no effect on DuckDB.
bool preloaded_httpfs = false;

namespace {
struct PreloadedHttpfsInit {
    PreloadedHttpfsInit() { preloaded_httpfs = true; }
} _preloaded_httpfs_init;
}  // namespace

string web::experimental_s3_tables_global_proxy{""};

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
web::Result<std::reference_wrapper<WebDB>> WebDB::Get() {
    static duckdb::unique_ptr<WebDB> db = nullptr;
    if (db == nullptr) {
        db = Create();
    }
    return *db;
}

/// Constructor
WebDB::Connection::Connection(WebDB& webdb)
    : webdb_(webdb), connection_(*webdb.database_) {}
/// Constructor
WebDB::Connection::~Connection() = default;

namespace {
/// Convert identifiers to plain column names
vector<string> ColumnNames(const vector<Identifier>& identifiers) {
    vector<string> names;
    names.reserve(identifiers.size());
    for (auto& identifier : identifiers) {
        names.push_back(identifier.GetIdentifierName());
    }
    return names;
}
/// Encode column types as the struct value the columns parameter of read_csv / read_json expects
Value ColumnTypesValue(const child_list_t<LogicalType>& columns) {
    child_list_t<Value> values;
    values.reserve(columns.size());
    for (auto& col : columns) {
        values.emplace_back(col.first, Value(col.second.ToString()));
    }
    return Value::STRUCT(std::move(values));
}
/// Does the buffered Arrow IPC stream end with its end-of-stream marker? Messages are scanned from the given
/// offset, which is advanced past every complete message.
web::Result<bool> ArrowIPCStreamComplete(const std::vector<uint8_t>& stream, size_t& scanned) {
    nanoarrow::ipc::UniqueDecoder decoder;
    ArrowIpcDecoderInit(decoder.get());
    while (scanned < stream.size()) {
        ArrowBufferView data{{stream.data() + scanned}, static_cast<int64_t>(stream.size() - scanned)};
        int32_t prefix_size = 0;
        ArrowError error{};
        auto code = ArrowIpcDecoderPeekHeader(decoder.get(), data, &prefix_size, &error);
        if (code == ESPIPE) {
            // The header is not complete yet
            return false;
        }
        if (code == ENODATA) {
            // The end of the stream
            return true;
        }
        if (code != NANOARROW_OK) {
            return web::Status::Invalid("Invalid Arrow IPC stream: ", ArrowErrorMessage(&error));
        }
        code = ArrowIpcDecoderVerifyHeader(decoder.get(), data, &error);
        if (code == ESPIPE) {
            return false;
        }
        if (code != NANOARROW_OK) {
            return web::Status::Invalid("Invalid Arrow IPC stream: ", ArrowErrorMessage(&error));
        }
        // The header size includes the prefix
        auto message_size = decoder->header_size_bytes + decoder->body_size_bytes;
        if (scanned + message_size > stream.size()) {
            // The body is not complete yet
            return false;
        }
        scanned += message_size;
    }
    return false;
}

/// Can a stream be opened on a submitted query result?
bool CanStream(const QueryResult& result) {
    return !result.HasError() && result.HasBufferedData() &&
           result.GetStatementProperties().result_eagerness != ResultEagerness::FORCED &&
           result.GetBufferedData().Lifetime() != ResultLifetime::RETAINED;
}
}  // namespace

web::Result<std::shared_ptr<web::Buffer>> WebDB::Connection::MaterializeQueryResult(
    duckdb::unique_ptr<duckdb::QueryResult> result) {
    current_query_result_.reset();
    current_query_stream_.reset();
    current_ipc_writer_.reset();

    ArrowIPCWriter writer{*connection_.context, result->GetTypes(), ColumnNames(result->GetNames()),
                          webdb_.config_->query, webdb_.config_->arrow_lossless_conversion};
    return writer.SerializeResult(*result);
}

web::Result<std::shared_ptr<web::Buffer>> WebDB::Connection::StreamQueryResult(
    duckdb::unique_ptr<duckdb::QueryResult> result) {
    current_query_result_.reset();
    current_query_stream_.reset();
    current_ipc_writer_.reset();
    auto types = result->GetTypes();
    auto names = ColumnNames(result->GetNames());
    // Stream the result if possible, otherwise chunks are fetched from the retained result
    if (CanStream(*result)) {
        current_query_stream_ = duckdb::make_uniq<duckdb::QueryResultStream<>>(std::move(result));
    } else {
        current_query_result_ = std::move(result);
    }

    // Serialize the schema, the record batches follow in FetchQueryResults
    current_ipc_writer_ = std::make_unique<ArrowIPCWriter>(*connection_.context, std::move(types), std::move(names),
                                                           webdb_.config_->query,
                                                           webdb_.config_->arrow_lossless_conversion);
    return current_ipc_writer_->SerializeSchema();
}

web::Result<std::shared_ptr<web::Buffer>> WebDB::Connection::RunQuery(std::string_view text) {
    try {
        // Send the query
        auto result = connection_.Query(std::string{text});
        // Multiple statements produce a chain of results, return the last one
        while (true) {
            if (result->HasError()) {
                return web::Status{web::StatusCode::ExecutionError, result->GetError()};
            }
            if (!result->next) break;
            auto next = std::move(result->next);
            result = std::move(next);
        }
        return MaterializeQueryResult(std::move(result));
    } catch (std::exception& e) {
        return web::Status{web::StatusCode::ExecutionError, e.what()};
    } catch (...) {
        return web::Status{web::StatusCode::ExecutionError, "unknown exception"};
    }
}

web::Result<std::shared_ptr<web::Buffer>> WebDB::Connection::PendingQuery(std::string_view text,
                                                                              bool allow_stream_result) {
    try {
        auto statements = connection_.ExtractStatements(std::string{text});
        if (statements.size() == 0) {
            return web::Status{web::StatusCode::ExecutionError, "no statements"};
        }
        current_pending_statements_ = std::move(statements);
        current_pending_statement_index_ = 0;
        current_allow_stream_result_ = allow_stream_result;
        current_pending_query_result_.reset();
        current_query_result_.reset();
        current_query_stream_.reset();
        current_ipc_writer_.reset();
        // Send the first query
        WEB_RETURN_NOT_OK(SubmitPendingStatement());
        current_pending_query_was_canceled_ = false;
        if (webdb_.config_->query.query_polling_interval.value_or(DEFAULT_QUERY_POLLING_INTERVAL) > 0) {
            return PollPendingQuery();
        } else {
            return nullptr;
        }
    } catch (std::exception& e) {
        return web::Status{web::StatusCode::ExecutionError, e.what()};
    } catch (...) {
        return web::Status{web::StatusCode::ExecutionError, "unknown exception"};
    }
}

web::Status WebDB::Connection::SubmitPendingStatement() {
    auto result = connection_.Submit(std::move(current_pending_statements_[current_pending_statement_index_]));
    if (result->HasError()) {
        current_pending_query_result_.reset();
        current_pending_statements_.clear();
        return web::Status{web::StatusCode::ExecutionError, result->GetError()};
    }
    // Only the result of the last statement is returned, and only that may be streamed.
    // Everything else is materialized while polling.
    bool is_last = current_pending_statement_index_ + 1 == current_pending_statements_.size();
    if (!(is_last && current_allow_stream_result_ && CanStream(*result))) {
        result->Materialize();
    }
    current_pending_query_result_ = std::move(result);
    return web::Status::OK();
}

web::Result<std::shared_ptr<web::Buffer>> WebDB::Connection::PollPendingQuery() {
    if (current_pending_query_was_canceled_) {
        return web::Status{web::StatusCode::ExecutionError, "query was canceled"};
    } else if (current_pending_query_result_ == nullptr) {
        return web::Status{web::StatusCode::ExecutionError, "no active pending query"};
    }
    auto before = std::chrono::steady_clock::now();
    uint64_t elapsed;
    auto polling_interval = webdb_.config_->query.query_polling_interval.value_or(DEFAULT_QUERY_POLLING_INTERVAL);
    do {
        // Poll does not run tasks and is safe on results that already completed
        auto state = current_pending_query_result_->Poll();
        if (!IsObservable(state)) {
            state = current_pending_query_result_->ExecuteTask();
        }
        switch (state) {
            case QueryResultState::FINISHED:
            case QueryResultState::READY: {
                auto result = std::move(current_pending_query_result_);
                current_pending_statement_index_++;
                // If this was the last statement, then return the result
                if (current_pending_statement_index_ == current_pending_statements_.size()) {
                    current_pending_statements_.clear();
                    return StreamQueryResult(std::move(result));
                }
                // Otherwise, start the next statement
                result.reset();
                WEB_RETURN_NOT_OK(SubmitPendingStatement());
                break;
            }
            case QueryResultState::BLOCKED:
            case QueryResultState::NO_TASKS_AVAILABLE:
                return nullptr;
            case QueryResultState::NOT_READY:
                break;
            case QueryResultState::EXECUTION_ERROR: {
                auto err = current_pending_query_result_->GetError();
                current_pending_query_result_.reset();
                current_pending_statements_.clear();
                return web::Status{web::StatusCode::ExecutionError, err};
            }
        }
        auto after = std::chrono::steady_clock::now();
        elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(after - before).count();
    } while (elapsed < polling_interval);
    return nullptr;
}

bool WebDB::Connection::CancelPendingQuery() {
    // Only reset the pending query if it hasn't completed yet
    if (current_pending_query_result_ != nullptr && current_query_result_ == nullptr &&
        current_query_stream_ == nullptr) {
        current_pending_query_was_canceled_ = true;
        current_pending_query_result_.reset();
        current_pending_statements_.clear();
        return true;
    } else {
        return false;
    }
}

DuckDBWasmResultsWrapper WebDB::Connection::FetchQueryResults() {
    try {
        // Fetch data if a query is active
        duckdb::unique_ptr<duckdb::DataChunk> chunk;
        if (current_query_result_ == nullptr && current_query_stream_ == nullptr) {
            return DuckDBWasmResultsWrapper{nullptr};
        }

        if (current_query_stream_ != nullptr) {
            auto& stream = *current_query_stream_;
            auto before = std::chrono::steady_clock::now();
            uint64_t elapsed;
            auto polling_interval =
                webdb_.config_->query.query_polling_interval.value_or(DEFAULT_QUERY_POLLING_INTERVAL);
            bool done = false;
            do {
                // Pop a chunk if one is buffered, this does not run any task
                auto state = stream.TryFetch(chunk);
                if (chunk) break;
                if (state == QueryResultState::FINISHED) {
                    done = true;
                    break;
                }
                if (state != QueryResultState::EXECUTION_ERROR) {
                    state = stream.ExecuteTask();
                }
                switch (state) {
                    case QueryResultState::EXECUTION_ERROR:
                        return web::Status{web::StatusCode::ExecutionError, stream.GetError()};
                    case QueryResultState::BLOCKED:
                        stream.WaitForTask();
                        return DuckDBWasmResultsWrapper::ResponseStatus::DUCKDB_WASM_RETRY;
                    case QueryResultState::NO_TASKS_AVAILABLE:
                        return DuckDBWasmResultsWrapper::ResponseStatus::DUCKDB_WASM_RETRY;
                    case QueryResultState::READY:
                    case QueryResultState::NOT_READY:
                    case QueryResultState::FINISHED:
                        break;
                }

                auto after = std::chrono::steady_clock::now();
                elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(after - before).count();
            } while (elapsed < polling_interval);

            if (!chunk && !done) {
                return DuckDBWasmResultsWrapper::ResponseStatus::DUCKDB_WASM_RETRY;
            }
        } else {
            // Fetch next result chunk
            chunk = current_query_result_->Fetch();
            if (current_query_result_->HasError()) {
                return web::Status{web::StatusCode::ExecutionError, current_query_result_->GetError()};
            }
        }
        // Reached end?
        if (!chunk) {
            current_query_result_.reset();
            current_query_stream_.reset();
            current_ipc_writer_.reset();
            return DuckDBWasmResultsWrapper{nullptr};
        }

        // Serialize the record batch
        return current_ipc_writer_->SerializeChunk(*chunk);
    } catch (std::exception& e) {
        return web::Status{web::StatusCode::ExecutionError, e.what()};
    }
}
/// Fetch table names
web::Result<std::string> WebDB::Connection::GetTableNames(std::string_view text) {
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
        return web::Status{web::StatusCode::ExecutionError, e.what()};
    }
}

web::Result<size_t> WebDB::Connection::CreatePreparedStatement(std::string_view text) {
    try {
        auto prep = connection_.Prepare(std::string{text});
        if (prep->HasError()) return web::Status{web::StatusCode::ExecutionError, prep->GetError()};
        auto id = next_prepared_statement_id_++;

        // Wrap around if maximum exceeded
        if (next_prepared_statement_id_ == std::numeric_limits<size_t>::max()) next_prepared_statement_id_ = 0;

        prepared_statements_.emplace(id, std::move(prep));
        return id;
    } catch (std::exception& e) {
        return web::Status{web::StatusCode::ExecutionError, e.what()};
    }
}

web::Result<duckdb::unique_ptr<duckdb::QueryResult>> WebDB::Connection::ExecutePreparedStatement(
    size_t statement_id, std::string_view args_json, bool allow_stream_result) {
    try {
        auto stmt = prepared_statements_.find(statement_id);
        if (stmt == prepared_statements_.end())
            return web::Status{web::StatusCode::KeyError, "No prepared statement found with ID"};

        rapidjson::Document args_doc;
        rapidjson::ParseResult ok = args_doc.Parse(args_json.data(), args_json.size());
        if (!ok) return web::Status{web::StatusCode::Invalid, rapidjson::GetParseError_En(ok.Code())};
        if (!args_doc.IsArray()) return web::Status{web::StatusCode::Invalid, "Arguments must be given as array"};

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
                return web::Status{web::StatusCode::Invalid,
                                     "Invalid column type encountered for argument " + std::to_string(index)};
            ++index;
        }

        auto result = allow_stream_result ? stmt->second->Submit(values) : stmt->second->Execute(values);
        if (result->HasError()) return web::Status{web::StatusCode::ExecutionError, result->GetError()};
        return result;
    } catch (std::exception& e) {
        return web::Status{web::StatusCode::ExecutionError, e.what()};
    }
}

web::Result<std::shared_ptr<web::Buffer>> WebDB::Connection::RunPreparedStatement(size_t statement_id,
                                                                                      std::string_view args_json) {
    auto result = ExecutePreparedStatement(statement_id, args_json, false);
    if (!result.ok()) return result.status();
    return MaterializeQueryResult(std::move(*result));
}

web::Result<std::shared_ptr<web::Buffer>> WebDB::Connection::SendPreparedStatement(size_t statement_id,
                                                                                       std::string_view args_json) {
    auto result = ExecutePreparedStatement(statement_id, args_json, true);
    if (!result.ok()) return result.status();
    return StreamQueryResult(std::move(*result));
}

web::Status WebDB::Connection::ClosePreparedStatement(size_t statement_id) {
    auto it = prepared_statements_.find(statement_id);
    if (it == prepared_statements_.end())
        return web::Status{web::StatusCode::KeyError, "No prepared statement found with ID"};
    prepared_statements_.erase(it);
    return web::Status::OK();
}

web::Status WebDB::Connection::CreateScalarFunction(std::string_view def_json) {
    // Read the function definiton
    rapidjson::Document def_doc;
    def_doc.Parse(def_json.data(), def_json.size());
    auto def = duckdb::make_shared_ptr<UDFFunctionDeclaration>();
    WEB_RETURN_NOT_OK(def->ReadFrom(def_doc));

    // Read return type
    auto name = def->name;
    auto ret_type = def->return_type;

    // UDF lambda
    auto udf = [&, udf = std::move(def)](DataChunk& chunk, ExpressionState& state, Vector& vec) {
        auto status = CallScalarUDFFunction(*udf, chunk, state, vec);
        if (!status.ok()) {
            throw std::runtime_error(status.message());
        }
    };

    // Register the vectorized function
    ScalarFunction scalar_function(Identifier(name), vector<LogicalType>{}, ret_type, udf, nullptr, nullptr, nullptr,
                                   LogicalType::ANY);
    scalar_function.SetNullHandling(FunctionNullHandling::SPECIAL_HANDLING);
    CreateScalarFunctionInfo info(std::move(scalar_function));
    connection_.context->RegisterFunction(info);
    return web::Status::OK();
}

#ifndef __EMSCRIPTEN__
void duckdb_web_udf_scalar_call(WASMResponse*, size_t, const void*, size_t, const void*, size_t) {}
#else
extern "C" void duckdb_web_udf_scalar_call(WASMResponse* response, size_t function_id, const void* desc_buf,
                                           size_t desc_size, const void* ptrs_buf, size_t ptrs_size);
#endif

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
web::Status WebDB::Connection::CallScalarUDFFunction(UDFFunctionDeclaration& function, DataChunk& chunk,
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
        WEB_ASSIGN_OR_RAISE(auto args, json::CreateDataView(desc_doc, chunk, data_ptrs, additional_buffers));
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
        return web::Status::ExecutionError(err);
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
        auto out_string_ptr = FlatVector::GetDataMutable<string_t>(out);
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
        // FIXME: the result buffer used to be handed over to the vector, after the bump to DuckDB v2.0 it is copied
        std::unique_ptr<char[]> owned_buffer{res_buf};
        std::memcpy(FlatVector::GetDataMutable(out), res_buf,
                    GetTypeIdSize(out.GetType().InternalType()) * chunk.size());
    }

    free(validity_arr);
    free(res_arr);
    return web::Status::OK();
}

/// Insert a record batch
web::Status WebDB::Connection::InsertArrowFromIPCStream(nonstd::span<const uint8_t> stream,
                                                          std::string_view options_json) {
    try {
        // First call?
        if (!arrow_insert_options_) {
            /// Read table options.
            /// We deliberately do this BEFORE buffering the ipc stream.
            /// This ensures that we always have valid options.
            rapidjson::Document options_doc;
            options_doc.Parse(options_json.data(), options_json.size());
            ArrowInsertOptions options;
            WEB_RETURN_NOT_OK(options.ReadFrom(options_doc));
            arrow_insert_options_ = options;
            arrow_ipc_stream_.clear();
            arrow_ipc_stream_scanned_ = 0;
        }

        /// Buffer the stream bytes until the end of the stream, which may take several calls
        arrow_ipc_stream_.insert(arrow_ipc_stream_.end(), stream.begin(), stream.end());
        WEB_ASSIGN_OR_RAISE(auto complete, ArrowIPCStreamComplete(arrow_ipc_stream_, arrow_ipc_stream_scanned_));
        if (!complete) {
            return web::Status::OK();
        }

        /// Scan the buffered stream with duckdb-nanoarrow
        child_list_t<Value> buffer_struct;
        buffer_struct.emplace_back("ptr", Value::POINTER(reinterpret_cast<uintptr_t>(arrow_ipc_stream_.data())));
        buffer_struct.emplace_back("size", Value::UBIGINT(arrow_ipc_stream_.size()));
        auto buffer_value = Value::STRUCT(std::move(buffer_struct));
        auto buffers = Value::LIST(buffer_value.type(), {buffer_value});
        auto func = connection_.TableFunction("scan_arrow_ipc", vector<Value>{std::move(buffers)});

        /// Create or insert
        if (arrow_insert_options_->create_new) {
            func->Create(Identifier(arrow_insert_options_->schema_name), Identifier(arrow_insert_options_->table_name));
        } else {
            func->Insert(Identifier(arrow_insert_options_->schema_name), Identifier(arrow_insert_options_->table_name));
        }

        // Reset the ipc stream
        arrow_insert_options_.reset();
        arrow_ipc_stream_.clear();
    } catch (const std::exception& e) {
        arrow_insert_options_.reset();
        arrow_ipc_stream_.clear();
        return web::Status::UnknownError(e.what());
    }
    return web::Status::OK();
}
/// Import a csv file
web::Status WebDB::Connection::InsertCSVFromPath(std::string_view path, std::string_view options_json) {
    try {
        /// Read table options
        rapidjson::Document options_doc;
        options_doc.Parse(options_json.data(), options_json.size());
        csv::CSVInsertOptions options;
        WEB_RETURN_NOT_OK(options.ReadFrom(options_doc));

        /// Get table name and schema
        auto schema_name = options.schema_name.empty() ? "main" : options.schema_name;
        if (options.table_name.empty()) return web::Status::Invalid("missing 'name' option");

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
            named_params.insert({"columns", ColumnTypesValue(*options.columns)});
        }
        named_params.insert({"auto_detect", Value::BOOLEAN(options.auto_detect.value_or(true))});

        /// Execute the csv scan
        auto func = duckdb::make_shared_ptr<TableFunctionRelation>(connection_.context, "read_csv",
                                                                   std::move(unnamed_params), named_params);

        /// Create or insert
        if (options.create_new) {
            func->Create(Identifier(options.schema_name), Identifier(options.table_name));
        } else {
            func->Insert(Identifier(options.schema_name), Identifier(options.table_name));
        }

    } catch (const std::exception& e) {
        return web::Status::UnknownError(e.what());
    }
    return web::Status::OK();
}

/// Import a json file
web::Status WebDB::Connection::InsertJSONFromPath(std::string_view path, std::string_view options_json) {
    try {
        /// Read table options
        rapidjson::Document options_doc;
        options_doc.Parse(options_json.data(), options_json.size());
        json::JSONInsertOptions options;
        WEB_RETURN_NOT_OK(options.ReadFrom(options_doc));

        /// Get table name and schema
        auto schema_name = options.schema_name.empty() ? "main" : options.schema_name;
        if (options.table_name.empty()) return web::Status::Invalid("missing 'name' option");

        /// Detect the table shape from the first character unless it is given
        auto shape = options.table_shape.value_or(json::JSONTableShape::UNRECOGNIZED);
        if (shape == json::JSONTableShape::UNRECOGNIZED || options.auto_detect.value_or(false)) {
            io::InputFileStream ifs{webdb_.file_page_buffer_, path};
            char c;
            while (ifs.get(c) && std::isspace(static_cast<unsigned char>(c))) {
            }
            if (!ifs) return web::Status::Invalid("JSON document is empty");
            if (c == '[') {
                shape = json::JSONTableShape::ROW_ARRAY;
            } else if (c == '{') {
                shape = json::JSONTableShape::COLUMN_OBJECT;
            } else {
                return web::Status::Invalid("JSON document is neither an array of rows nor an object of columns");
            }
        }

        /// Read the document with read_json
        std::vector<Value> unnamed_params;
        unnamed_params.emplace_back(std::string{path});
        std::unordered_map<std::string, Value> named_params;
        shared_ptr<Relation> rel;
        if (shape == json::JSONTableShape::ROW_ARRAY) {
            // [{"a":1,"b":2}, {"a":3,"b":4}]
            named_params.insert({"format", Value("array")});
            if (options.columns.has_value()) {
                named_params.insert({"columns", ColumnTypesValue(*options.columns)});
            }
            rel = duckdb::make_shared_ptr<TableFunctionRelation>(connection_.context, "read_json",
                                                                 std::move(unnamed_params), named_params);
        } else {
            // {"a":[1,3],"b":[2,4]}: a single record of lists that is unnested into rows
            named_params.insert({"format", Value("unstructured")});
            named_params.insert({"records", Value("true")});
            named_params.insert({"maximum_depth", Value::BIGINT(-1)});
            if (options.columns.has_value()) {
                child_list_t<LogicalType> list_columns;
                for (auto& col : *options.columns) {
                    list_columns.emplace_back(col.first, LogicalType::LIST(col.second));
                }
                named_params.insert({"columns", ColumnTypesValue(list_columns)});
            }
            rel = duckdb::make_shared_ptr<TableFunctionRelation>(connection_.context, "read_json",
                                                                 std::move(unnamed_params), named_params);
            vector<string> unnest_columns;
            for (auto& column : rel->Columns()) {
                unnest_columns.push_back("unnest(" + KeywordHelper::WriteQuoted(column.Name().GetIdentifierName(), '"') +
                                         ") AS " + KeywordHelper::WriteQuoted(column.Name().GetIdentifierName(), '"'));
            }
            rel = rel->Project(unnest_columns);
        }

        /// Create or insert
        if (options.create_new) {
            rel->Create(Identifier(schema_name), Identifier(options.table_name));
        } else {
            rel->Insert(Identifier(schema_name), Identifier(options.table_name));
        }

    } catch (const std::exception& e) {
        return web::Status::UnknownError(e.what());
    }
    return web::Status::OK();
}

// Register custom extension options in DuckDB for options that are handled in DuckDB-WASM instead of DuckDB
void WebDB::RegisterCustomExtensionOptions(shared_ptr<duckdb::DuckDB> database) {
    DEBUG_TRACE();
    // Fetch the config to enable the custom SET parameters
    auto& config = duckdb::DBConfig::GetConfig(*database->instance);
    auto webfs = io::WebFileSystem::Get();

    // Register S3 Config parameters
    if (webfs) {
        auto callback_builtin_httpfs = [](ClientContext& context, SetScope scope, Value& parameter) {
            preloaded_httpfs = BooleanValue::Get(parameter);
        };
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
        auto callback_experimental_s3_tables_global_proxy = [](ClientContext& context, SetScope scope,
                                                               Value& parameter) {
            experimental_s3_tables_global_proxy = StringValue::Get(parameter);
        };

        config.AddExtensionOption("builtin_httpfs", "Use built-in HTTPS support", LogicalType::BOOLEAN, false,
                                  callback_builtin_httpfs);
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
        config.AddExtensionOption("experimental_s3_tables_global_proxy",
                                  "Experimental - Global proxy to interact with S3 Tables", LogicalType::VARCHAR,
                                  Value(""), callback_experimental_s3_tables_global_proxy);

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
    auto parser = duckdb::Parser::GetBuiltinParser();
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

class ProgressBarCustom : public ProgressBarDisplay {
    double value{0.0};
    double times{0.0};
    double to_send{1.0};

   public:
    ProgressBarCustom() {
        value = 0.0;
        times = 0.0;
        to_send = 1.0;
    }
    ~ProgressBarCustom() {}
    static void SendMessage(double end, double percentage, double times) {
        emscripten::val::global("DUCKDB_RUNTIME").call<void>("progressUpdate", end ? 1.0 : 0.0, percentage, times);
    }

   public:
    void Update(double percentage) {
        if (percentage >= value + 1.0) {
            value = percentage;
            times = 1.0;
            SendMessage(false, percentage, times);
            to_send = 10.0;
        } else {
            times += 1.0;
            if (times >= to_send) {
                SendMessage(false, percentage, times);
                to_send *= 10.0;
            }
        }
    }
    void Finish() {
        SendMessage(true, value, times);
        value = 0.0;
        times = 0.0;
        to_send = 1.0;
    }
    static unique_ptr<ProgressBarDisplay> GetProgressBar() { return make_uniq<ProgressBarCustom>(); }
};

/// Create a session
WebDB::Connection* WebDB::Connect() {
    auto conn = duckdb::make_uniq<WebDB::Connection>(*this);
    auto conn_ptr = conn.get();
    connections_.insert({conn_ptr, std::move(conn)});
    ClientConfig::GetConfig(*conn_ptr->connection_.context).wait_time = 1;
    ClientConfig::GetConfig(*conn_ptr->connection_.context).display_create_func = ProgressBarCustom::GetProgressBar;
    return conn_ptr;
}

/// End a session
void WebDB::Disconnect(Connection* session) { connections_.erase(session); }

/// Flush all file buffers
void WebDB::FlushFiles() { file_page_buffer_->FlushFiles(); }
/// Flush file by path
void WebDB::FlushFile(std::string_view path) { file_page_buffer_->FlushFile(path); }

/// Reset the database
web::Status WebDB::Reset() {
    DEBUG_TRACE();
    return Open();
}

/// Open a database
web::Status WebDB::Open(std::string_view args_json) {
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
        auto virtual_fs = make_uniq<VirtualFileSystem>(std::move(buffered_fs));
        // Remote files are read by the web file system too, DuckDB needs a sub file system to claim them
        virtual_fs->RegisterSubSystem(make_uniq<io::RemoteWebFileSystem>(*buffered_fs_ptr));
        db_config.file_system = std::move(virtual_fs);
        db_config.SetOptionByName("allow_unsigned_extensions", config_->allow_unsigned_extensions);
        db_config.SetOption("arrow_lossless_conversion", config_->arrow_lossless_conversion);
        db_config.options.maximum_threads = config_->maximum_threads;
        // Spilling needs a file system that can create files during a query, the runtime passes a directory
        // when it has one
        db_config.options.use_temporary_directory = config_->temporary_directory.has_value();
        if (config_->temporary_directory.has_value()) {
            db_config.options.temporary_directory = config_->temporary_directory.value();
        }
        db_config.options.access_mode = access_mode;
        db_config.SetOptionByName("duckdb_api", "wasm");
        db_config.options.custom_user_agent = config_->custom_user_agent;
        // FIXME: use_direct_io is no longer a database-wide option in DuckDB v2.0 (now ATTACH ... (IO_MODE)),
        // config_->use_direct_io is currently ignored
        auto db = make_shared_ptr<duckdb::DuckDB>(config_->path, &db_config);
#ifndef WASM_LOADABLE_EXTENSIONS
        duckdb_web_parquet_init(db.get());
#if defined(DUCKDB_JSON_EXTENSION)
        duckdb_web_json_init(db.get());
#endif
#endif  // WASM_LOADABLE_EXTENSIONS
        RegisterCustomExtensionOptions(db);

        auto& config = duckdb::DBConfig::GetConfig(*db->instance);
        if (config_->temporary_directory.has_value()) {
            // DuckDB cannot measure the free space of the web file system (it reads 0 and would refuse to spill),
            // the temporary directory is unlimited. The limit only reaches the buffer manager through the setting
            // once the database exists.
            auto swap_space = duckdb::DConstants::INVALID_INDEX - 1;
            duckdb::BufferManager::GetBufferManager(*db->instance).SetSwapLimit(swap_space);
            config.options.maximum_swap_space = swap_space;
        }

#ifdef WASM_LOADABLE_EXTENSIONS
        config.SetExternalExtensionProvider(make_shared_ptr<WasmExtensionProvider>());
#endif

        if (!config.encryption_util) {
            config.encryption_util = make_shared_ptr<duckdb_mbedtls::MbedTlsWrapper::AESStateMBEDTLSFactory>();
        }

        // Reset state that is specific to the old database
        connections_.clear();
        database_.reset();
        buffered_filesystem_ = nullptr;

        // Store  new database
        buffered_filesystem_ = buffered_fs_ptr;
        database_ = std::move(db);
    } catch (std::exception& ex) {
        return web::Status::Invalid("Opening the database failed with error: ", ex.what());
    } catch (...) {
        return web::Status::Invalid("Opening the database failed");
    }
    return web::Status::OK();
}
/// Register a file URL
web::Status WebDB::RegisterFileURL(std::string_view file_name, std::string_view file_url,
                                     io::WebFileSystem::DataProtocol protocol, bool direct_io) {
    // No web filesystem configured?
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) return web::Status::Invalid("WebFileSystem is not configured");
    // Try to drop the file in the buffered file system.
    // If that fails we have to give up since someone still holds an open file ref.
    if (!buffered_filesystem_->TryDropFile(file_name)) {
        return web::Status::Invalid("File is already registered and is still buffered");
    }
    // Already pinned by us?
    // Unpin the file to re-register the new file.
    if (auto iter = pinned_web_files_.find(file_name); iter != pinned_web_files_.end()) {
        pinned_web_files_.erase(iter);
    }
    // Register new file url in web filesystem.
    // Pin the file handle to keep the file alive.
    WEB_ASSIGN_OR_RAISE(auto file_hdl, web_fs->RegisterFileURL(file_name, file_url, protocol));
    pinned_web_files_.insert({file_hdl->GetName(), std::move(file_hdl)});

    // Register new file in buffered filesystem.
    io::BufferedFileSystem::FileConfig file_config = {
        .force_direct_io = direct_io,
    };
    buffered_filesystem_->RegisterFile(file_name, file_config);
    return web::Status::OK();
}
/// Register a file URL
web::Status WebDB::RegisterFileBuffer(std::string_view file_name, std::unique_ptr<char[]> buffer,
                                        size_t buffer_length) {
    // No web filesystem configured?
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) return web::Status::Invalid("WebFileSystem is not configured");
    // Try to drop the file in the buffered file system.
    // If that fails we have to give up since someone still holds an open file ref.
    if (!buffered_filesystem_->TryDropFile(file_name)) {
        return web::Status::Invalid("File is already registered and is still buffered");
    }
    // Already pinned by us?
    // Unpin the file to re-register the new file.
    if (auto iter = pinned_web_files_.find(file_name); iter != pinned_web_files_.end()) {
        pinned_web_files_.erase(iter);
    }
    // Register new file in web filesystem
    io::WebFileSystem::DataBuffer data{std::move(buffer), buffer_length};
    WEB_ASSIGN_OR_RAISE(auto file_hdl, web_fs->RegisterFileBuffer(file_name, std::move(data)));
    // Register new file in buffered filesystem to bypass the paging with direct i/o.
    io::BufferedFileSystem::FileConfig file_config = {
        .force_direct_io = true,
    };
    buffered_filesystem_->RegisterFile(file_name, file_config);
    // Pin the file handle to keep the file alive
    pinned_web_files_.insert({file_hdl->GetName(), std::move(file_hdl)});
    return web::Status::OK();
}
/// Drop all files
web::Status WebDB::DropFiles() {
    file_page_buffer_->DropDanglingFiles();
    std::vector<std::string> files_to_drop;
    for (const auto& [key, handle] : pinned_web_files_) {
        files_to_drop.push_back(handle->GetName());
    }
    for (const auto& fileName : files_to_drop) {
        web::Status status = DropFile(fileName);
        if (!status.ok()) {
            return web::Status::Invalid("Failed to drop file: " + fileName);
        }
    }
    if (auto fs = io::WebFileSystem::Get()) {
        fs->DropDanglingFiles();
    }
    return web::Status::OK();
}
/// Drop a file
web::Status WebDB::DropFile(std::string_view fileName) {
    file_page_buffer_->TryDropFile(fileName);
    pinned_web_files_.erase(fileName);
    if (auto fs = io::WebFileSystem::Get()) {
        // A file DuckDB still holds open (the sink of a finished COPY keeps its handle until the next query) is
        // dropped once its last handle closes
        fs->DropFileWhenClosed(fileName);
    }
    return web::Status::OK();
}
/// Glob all known files
web::Result<std::string> WebDB::GlobFileInfos(std::string_view expression) {
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) return web::Status::Invalid("WebFileSystem is not configured");
    auto files = web_fs->Glob(std::string{expression});
    auto current_epoch = web_fs->LoadCacheEpoch();

    rapidjson::Document doc;
    doc.SetArray();
    auto& allocator = doc.GetAllocator();
    for (auto& file : files) {
        auto value = web_fs->WriteFileInfo(doc, file.path, current_epoch - 1);
        if (!value.IsNull()) doc.PushBack(value, allocator);
    }
    rapidjson::StringBuffer strbuf;
    rapidjson::Writer<rapidjson::StringBuffer> writer{strbuf};
    doc.Accept(writer);
    return strbuf.GetString();
}

/// Get the global file info as JSON
web::Result<std::string> WebDB::GetGlobalFileInfo(uint32_t cache_epoch) {
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) return web::Status::Invalid("WebFileSystem is not configured");

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
web::Result<std::string> WebDB::GetFileInfo(uint32_t file_id, uint32_t cache_epoch) {
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) return web::Status::Invalid("WebFileSystem is not configured");

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
web::Result<std::string> WebDB::GetFileInfo(std::string_view file_name, uint32_t cache_epoch) {
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) return web::Status::Invalid("WebFileSystem is not configured");

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
web::Status WebDB::CollectFileStatistics(std::string_view path, bool enable) {
    auto stats = file_stats_->EnableCollector(path, enable);
    if (auto web_fs = io::WebFileSystem::Get()) {
        web_fs->CollectFileStatistics(path, stats);
    }
    file_page_buffer_->CollectFileStatistics(path, std::move(stats));
    return web::Status::OK();
}
/// Export file page statistics
web::Result<std::shared_ptr<web::Buffer>> WebDB::ExportFileStatistics(std::string_view path) {
    return file_stats_->ExportStatistics(path);
}

/// Copy a file to a buffer
web::Result<std::shared_ptr<web::Buffer>> WebDB::CopyFileToBuffer(std::string_view path) {
    auto& fs = filesystem();
    auto src = fs.OpenFile(std::string{path}, duckdb::FileFlags::FILE_FLAGS_READ);
    auto n = fs.GetFileSize(*src);
    auto buffer = web::Buffer::Allocate(n);

    auto writer = buffer->mutable_data();
    while (n > 0) {
        auto m = fs.Read(*src, writer, n);
        assert(m <= n);
        writer += m;
        if (m == 0) break;
    }

    buffer->Resize(writer - buffer->data());
    return buffer;
}

/// Copy a file to a path
web::Status WebDB::CopyFileToPath(std::string_view path, std::string_view out) {
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

    return web::Status::OK();
}

}  // namespace web
}  // namespace duckdb
