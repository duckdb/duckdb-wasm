#include <cstring>

#include "duckdb/common/error_data.hpp"
#include "duckdb/common/serializer/binary_serializer.hpp"
#include "duckdb/common/serializer/memory_stream.hpp"
#include "duckdb/common/types/data_chunk.hpp"
#include "duckdb/common/types/vector.hpp"
#include "duckdb/function/cast/default_casts.hpp"
#include "duckdb/main/client_context.hpp"
#include "duckdb/main/database.hpp"
#include "duckdb/main/materialized_query_result.hpp"
#include "duckdb/main/pending_query_result.hpp"
#include "duckdb/main/stream_query_result.hpp"
#include "duckdb/web/experimental/wire_serializer.h"
#include "duckdb/web/experimental/wire_types.h"
#include "duckdb/web/utils/wasm_response.h"
#include "duckdb/web/webdb.h"

using namespace duckdb::web;
using namespace duckdb::web::experimental;

// === Helpers ===

std::string WebDB::Connection::ExperimentalSerializeDataChunk(duckdb::DataChunk& chunk) {
    duckdb::MemoryStream stream;
    duckdb::BinarySerializer serializer(stream);
    serializer.Begin();
    chunk.Serialize(serializer);
    serializer.End();
    return std::string(reinterpret_cast<const char*>(stream.GetData()), stream.GetPosition());
}

std::string WebDB::Connection::ExperimentalSerializeChunk(duckdb::DataChunk& chunk) {
    if (experimental_.cast_mode == CastMode::NONE) {
        return ExperimentalSerializeDataChunk(chunk);
    }
    bool as_json = (experimental_.cast_mode == CastMode::TO_VARCHAR_JSON);
    // Build target types: nested/JSON columns get cast to JSON type (valid JSON syntax),
    // all others get cast to VARCHAR.
    duckdb::DataChunk varchar_chunk;
    duckdb::vector<duckdb::LogicalType> target_types;
    target_types.reserve(chunk.ColumnCount());
    for (duckdb::idx_t col = 0; col < chunk.ColumnCount(); col++) {
        auto& src_type = chunk.data[col].GetType();
        if (as_json && (src_type.IsNested() || src_type.IsJSONType())) {
            target_types.push_back(duckdb::LogicalType::JSON());
        } else {
            target_types.push_back(duckdb::LogicalType::VARCHAR);
        }
    }
    varchar_chunk.Initialize(*connection_.context, target_types);
    varchar_chunk.SetCardinality(chunk.size());
    for (duckdb::idx_t col = 0; col < chunk.ColumnCount(); col++) {
        duckdb::VectorOperations::Cast(*connection_.context, chunk.data[col], varchar_chunk.data[col], chunk.size());
    }
    return ExperimentalSerializeDataChunk(varchar_chunk);
}

std::string WebDB::Connection::ExperimentalSerializeMetadata(duckdb::QueryResult& result, uint64_t row_count,
                                                             uint64_t chunk_count, const std::string& first_chunk_blob,
                                                             bool first_chunk_is_last) {
    WireResultMetadata meta;
    meta.has_error = result.HasError();
    if (meta.has_error) {
        meta.error_message = result.GetError();
        return WireSerializer::Serialize(meta);
    }
    for (auto& name : result.names) {
        meta.column_names.push_back(name);
    }
    for (auto& type : result.types) {
        meta.column_types.push_back(LogicalTypeProperties::FromLogicalType(type));
    }
    meta.statement_return_type = static_cast<uint8_t>(result.properties.return_type);
    meta.query_result_type = static_cast<uint8_t>(result.type);
    meta.row_count = row_count;
    meta.chunk_count = chunk_count;
    meta.first_chunk_blob = first_chunk_blob;
    meta.first_chunk_is_last = first_chunk_is_last;
    return WireSerializer::Serialize(meta);
}

// === Materialized query ===

std::string WebDB::Connection::ExperimentalQuery(std::string_view sql, uint8_t cast_mode) {
    experimental_.cast_mode = static_cast<CastMode>(cast_mode);
    experimental_.active_result.reset();
    experimental_.has_lookahead = false;

    auto result = connection_.Query(std::string{sql});

    uint64_t row_count = 0;
    uint64_t chunk_count = 0;
    std::string first_chunk_blob;
    if (!result->HasError()) {
        auto& mat_result = result->Cast<duckdb::MaterializedQueryResult>();
        row_count = mat_result.RowCount();
        auto& collection = mat_result.Collection();
        chunk_count = collection.ChunkCount();
        // Inline the first chunk
        if (chunk_count > 0) {
            duckdb::DataChunk first_chunk;
            first_chunk.Initialize(duckdb::Allocator::DefaultAllocator(), collection.Types());
            collection.FetchChunk(0, first_chunk);
            first_chunk_blob = ExperimentalSerializeChunk(first_chunk);
        }
    }
    bool first_chunk_is_last = (!first_chunk_blob.empty() && chunk_count <= 1);
    auto blob = ExperimentalSerializeMetadata(*result, row_count, chunk_count, first_chunk_blob, first_chunk_is_last);
    // Store the result for Fetch() — skip past the first chunk we already inlined
    if (!first_chunk_blob.empty()) {
        result->Fetch();
    }
    experimental_.active_result = std::move(result);
    return blob;
}

// === Non-blocking materializing query ===

static constexpr uint64_t DEFAULT_EXPERIMENTAL_POLLING_INTERVAL = 10;

std::string WebDB::Connection::ExperimentalQueryStart(std::string_view sql, uint8_t cast_mode) {
    experimental_.cast_mode = static_cast<CastMode>(cast_mode);
    experimental_.active_result.reset();
    experimental_.has_lookahead = false;
    experimental_.pending_query_was_canceled = false;

    auto statements = connection_.ExtractStatements(std::string{sql});
    if (statements.empty()) {
        WireResultMetadata meta;
        meta.has_error = true;
        meta.error_message = "no statements";
        return WireSerializer::Serialize(meta);
    }
    experimental_.pending_statements = std::move(statements);
    experimental_.pending_statement_index = 0;

    // allow_stream_result = false → forces materialization when execution finishes
    auto pending = connection_.PendingQuery(std::move(experimental_.pending_statements[0]), false);
    if (pending->HasError()) {
        WireResultMetadata meta;
        meta.has_error = true;
        meta.error_message = pending->GetError();
        experimental_.pending_statements.clear();
        return WireSerializer::Serialize(meta);
    }
    experimental_.pending_query_result = std::move(pending);
    return ExperimentalQueryPoll();
}

std::string WebDB::Connection::ExperimentalQueryPoll() {
    if (experimental_.pending_query_was_canceled) {
        WireResultMetadata meta;
        meta.has_error = true;
        meta.error_message = "query was canceled";
        return WireSerializer::Serialize(meta);
    }
    if (!experimental_.pending_query_result) {
        return "";
    }

    auto before = std::chrono::steady_clock::now();
    uint64_t elapsed;
    do {
        switch (experimental_.pending_query_result->ExecuteTask()) {
            case duckdb::PendingExecutionResult::EXECUTION_FINISHED:
            case duckdb::PendingExecutionResult::RESULT_READY: {
                auto result = experimental_.pending_query_result->Execute();
                experimental_.pending_statement_index++;
                if (experimental_.pending_statement_index == experimental_.pending_statements.size()) {
                    // Last statement — materialize and return full metadata
                    experimental_.pending_query_result.reset();
                    experimental_.pending_statements.clear();

                    uint64_t row_count = 0;
                    uint64_t chunk_count = 0;
                    std::string first_chunk_blob;
                    if (!result->HasError()) {
                        auto& mat_result = result->Cast<duckdb::MaterializedQueryResult>();
                        row_count = mat_result.RowCount();
                        auto& collection = mat_result.Collection();
                        chunk_count = collection.ChunkCount();
                        if (chunk_count > 0) {
                            duckdb::DataChunk first_chunk;
                            first_chunk.Initialize(duckdb::Allocator::DefaultAllocator(), collection.Types());
                            collection.FetchChunk(0, first_chunk);
                            first_chunk_blob = ExperimentalSerializeChunk(first_chunk);
                        }
                    }
                    bool first_chunk_is_last = (!first_chunk_blob.empty() && chunk_count <= 1);
                    auto blob = ExperimentalSerializeMetadata(*result, row_count, chunk_count, first_chunk_blob,
                                                              first_chunk_is_last);
                    if (!first_chunk_blob.empty()) {
                        result->Fetch();
                    }
                    experimental_.active_result = std::move(result);
                    return blob;
                }
                // More statements — start the next one
                auto next_pending = connection_.PendingQuery(
                    std::move(experimental_.pending_statements[experimental_.pending_statement_index]), false);
                if (next_pending->HasError()) {
                    WireResultMetadata meta;
                    meta.has_error = true;
                    meta.error_message = next_pending->GetError();
                    experimental_.pending_query_result.reset();
                    experimental_.pending_statements.clear();
                    return WireSerializer::Serialize(meta);
                }
                experimental_.pending_query_result = std::move(next_pending);
                break;
            }
            case duckdb::PendingExecutionResult::BLOCKED:
            case duckdb::PendingExecutionResult::NO_TASKS_AVAILABLE:
                return "";
            case duckdb::PendingExecutionResult::RESULT_NOT_READY:
                break;
            case duckdb::PendingExecutionResult::EXECUTION_ERROR: {
                auto err = experimental_.pending_query_result->GetError();
                experimental_.pending_query_result.reset();
                experimental_.pending_statements.clear();
                WireResultMetadata meta;
                meta.has_error = true;
                meta.error_message = err;
                return WireSerializer::Serialize(meta);
            }
        }
        auto after = std::chrono::steady_clock::now();
        elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(after - before).count();
    } while (elapsed < DEFAULT_EXPERIMENTAL_POLLING_INTERVAL);
    return "";
}

// === Streaming query ===

std::string WebDB::Connection::ExperimentalSendQuery(std::string_view sql, uint8_t cast_mode) {
    experimental_.cast_mode = static_cast<CastMode>(cast_mode);
    experimental_.active_result.reset();
    experimental_.has_lookahead = false;
    experimental_.pending_query_was_canceled = false;

    auto statements = connection_.ExtractStatements(std::string{sql});
    if (statements.empty()) {
        WireResultMetadata meta;
        meta.has_error = true;
        meta.error_message = "no statements";
        return WireSerializer::Serialize(meta);
    }
    experimental_.pending_statements = std::move(statements);
    experimental_.pending_statement_index = 0;

    auto pending = connection_.PendingQuery(std::move(experimental_.pending_statements[0]), true);
    if (pending->HasError()) {
        WireResultMetadata meta;
        meta.has_error = true;
        meta.error_message = pending->GetError();
        experimental_.pending_statements.clear();
        return WireSerializer::Serialize(meta);
    }
    experimental_.pending_query_result = std::move(pending);
    return ExperimentalPollPendingQuery();
}

std::string WebDB::Connection::ExperimentalPollPendingQuery() {
    if (experimental_.pending_query_was_canceled) {
        WireResultMetadata meta;
        meta.has_error = true;
        meta.error_message = "query was canceled";
        return WireSerializer::Serialize(meta);
    }
    if (!experimental_.pending_query_result) {
        // No pending query — return empty to signal "nothing to do"
        return "";
    }

    auto before = std::chrono::steady_clock::now();
    uint64_t elapsed;
    do {
        switch (experimental_.pending_query_result->ExecuteTask()) {
            case duckdb::PendingExecutionResult::EXECUTION_FINISHED:
            case duckdb::PendingExecutionResult::RESULT_READY: {
                auto result = experimental_.pending_query_result->Execute();
                experimental_.pending_statement_index++;
                if (experimental_.pending_statement_index == experimental_.pending_statements.size()) {
                    // Last statement — store result for fetch, serialize metadata
                    experimental_.pending_query_result.reset();
                    experimental_.pending_statements.clear();

                    // Eagerly fetch first chunk to inline
                    std::string first_chunk_blob;
                    bool first_chunk_is_last = false;
                    if (!result->HasError()) {
                        auto chunk = result->Fetch();
                        if (chunk && chunk->size() > 0) {
                            first_chunk_blob = ExperimentalSerializeChunk(*chunk);
                            auto next = result->Fetch();
                            if (!next || next->size() == 0) {
                                first_chunk_is_last = true;
                            } else {
                                experimental_.next_chunk_blob = ExperimentalSerializeChunk(*next);
                                experimental_.has_lookahead = true;
                            }
                        }
                    }
                    auto blob = ExperimentalSerializeMetadata(*result, 0, 0, first_chunk_blob, first_chunk_is_last);
                    experimental_.active_result = std::move(result);
                    return blob;
                }
                // More statements — start the next one
                auto next_pending = connection_.PendingQuery(
                    std::move(experimental_.pending_statements[experimental_.pending_statement_index]), true);
                if (next_pending->HasError()) {
                    WireResultMetadata meta;
                    meta.has_error = true;
                    meta.error_message = next_pending->GetError();
                    experimental_.pending_query_result.reset();
                    experimental_.pending_statements.clear();
                    return WireSerializer::Serialize(meta);
                }
                experimental_.pending_query_result = std::move(next_pending);
                break;
            }
            case duckdb::PendingExecutionResult::BLOCKED:
            case duckdb::PendingExecutionResult::NO_TASKS_AVAILABLE:
                return "";  // Not ready — JS should call back
            case duckdb::PendingExecutionResult::RESULT_NOT_READY:
                break;
            case duckdb::PendingExecutionResult::EXECUTION_ERROR: {
                auto err = experimental_.pending_query_result->GetError();
                experimental_.pending_query_result.reset();
                experimental_.pending_statements.clear();
                WireResultMetadata meta;
                meta.has_error = true;
                meta.error_message = err;
                return WireSerializer::Serialize(meta);
            }
        }
        auto after = std::chrono::steady_clock::now();
        elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(after - before).count();
    } while (elapsed < DEFAULT_EXPERIMENTAL_POLLING_INTERVAL);
    return "";  // Timed out — JS should call back
}

// === Fetch ===

static constexpr size_t EXPERIMENTAL_FETCH_BATCH_BYTES = 256 * 1024;

std::string WebDB::Connection::ExperimentalFetch() {
    if (!experimental_.active_result) {
        return "";
    }

    ChunksEnvelope envelope;
    size_t total_bytes = 0;
    bool done = false;

    // Start with the lookahead chunk if available
    if (experimental_.has_lookahead) {
        total_bytes += experimental_.next_chunk_blob.size();
        ChunkWrapper w;
        w.type = ChunkWrapperType::REGULAR_CHUNK;
        w.data = std::move(experimental_.next_chunk_blob);
        envelope.wrappers.push_back(std::move(w));
        experimental_.has_lookahead = false;
    }

    while (total_bytes < EXPERIMENTAL_FETCH_BATCH_BYTES) {
        auto chunk = experimental_.active_result->Fetch();
        if (!chunk || chunk->size() == 0) {
            done = true;
            break;
        }
        auto blob = ExperimentalSerializeChunk(*chunk);
        total_bytes += blob.size();
        ChunkWrapper w;
        w.type = ChunkWrapperType::REGULAR_CHUNK;
        w.data = std::move(blob);
        envelope.wrappers.push_back(std::move(w));
    }

    // Append end-of-stream sentinel
    ChunkWrapper sentinel;
    sentinel.type = ChunkWrapperType::FAKE_CHUNK;
    sentinel.is_last = done;
    envelope.wrappers.push_back(std::move(sentinel));

    if (done) {
        experimental_.active_result.reset();
    }

    return WireSerializer::WriteChunksEnvelope(envelope);
}

// === FetchChunkAt (random access into materialized result) ===

std::string WebDB::Connection::ExperimentalFetchChunkAt(uint64_t chunk_idx) {
    if (!experimental_.active_result) {
        return "";
    }

    auto& mat_result = experimental_.active_result->Cast<duckdb::MaterializedQueryResult>();
    auto& collection = mat_result.Collection();
    if (chunk_idx >= collection.ChunkCount()) {
        return "";
    }

    duckdb::DataChunk chunk;
    chunk.Initialize(duckdb::Allocator::DefaultAllocator(), collection.Types());
    collection.FetchChunk(chunk_idx, chunk);

    // Return raw serialized DataChunk (not wrapped in ChunksEnvelope).
    // This matches the wire protocol's FetchChunkAt behavior.
    return ExperimentalSerializeChunk(chunk);
}

// === Extern "C" exports ===

extern "C" {

using ConnectionHdl = uintptr_t;

void duckdb_web_experimental_version(WASMResponse* packed) {
    auto version = std::string(duckdb::DuckDB::LibraryVersion());
    auto codename = std::string(duckdb::DuckDB::ReleaseCodename());
    auto full = version + " (" + codename + ")";
    WASMResponseBuffer::Get().Store(*packed, std::move(full));
}

void duckdb_web_experimental_query(WASMResponse* packed, ConnectionHdl connHdl, const char* sql, uint8_t cast_mode) {
    try {
        auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
        auto blob = c->ExperimentalQuery(sql, cast_mode);
        WASMResponseBuffer::Get().Store(*packed, std::move(blob));
    } catch (std::exception& e) {
        WireResultMetadata meta;
        meta.has_error = true;
        meta.error_message = duckdb::ErrorData(e).Message();
        WASMResponseBuffer::Get().Store(*packed, WireSerializer::Serialize(meta));
    }
}

void duckdb_web_experimental_query_start(WASMResponse* packed, ConnectionHdl connHdl, const char* sql,
                                         uint8_t cast_mode) {
    try {
        auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
        auto blob = c->ExperimentalQueryStart(sql, cast_mode);
        WASMResponseBuffer::Get().Store(*packed, std::move(blob));
    } catch (std::exception& e) {
        WireResultMetadata meta;
        meta.has_error = true;
        meta.error_message = duckdb::ErrorData(e).Message();
        WASMResponseBuffer::Get().Store(*packed, WireSerializer::Serialize(meta));
    }
}

void duckdb_web_experimental_query_poll(WASMResponse* packed, ConnectionHdl connHdl) {
    try {
        auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
        auto blob = c->ExperimentalQueryPoll();
        WASMResponseBuffer::Get().Store(*packed, std::move(blob));
    } catch (std::exception& e) {
        WireResultMetadata meta;
        meta.has_error = true;
        meta.error_message = duckdb::ErrorData(e).Message();
        WASMResponseBuffer::Get().Store(*packed, WireSerializer::Serialize(meta));
    }
}

void duckdb_web_experimental_send_query(WASMResponse* packed, ConnectionHdl connHdl, const char* sql,
                                        uint8_t cast_mode) {
    try {
        auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
        auto blob = c->ExperimentalSendQuery(sql, cast_mode);
        WASMResponseBuffer::Get().Store(*packed, std::move(blob));
    } catch (std::exception& e) {
        WireResultMetadata meta;
        meta.has_error = true;
        meta.error_message = duckdb::ErrorData(e).Message();
        WASMResponseBuffer::Get().Store(*packed, WireSerializer::Serialize(meta));
    }
}

void duckdb_web_experimental_poll_pending_query(WASMResponse* packed, ConnectionHdl connHdl) {
    try {
        auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
        auto blob = c->ExperimentalPollPendingQuery();
        WASMResponseBuffer::Get().Store(*packed, std::move(blob));
    } catch (std::exception& e) {
        WireResultMetadata meta;
        meta.has_error = true;
        meta.error_message = duckdb::ErrorData(e).Message();
        WASMResponseBuffer::Get().Store(*packed, WireSerializer::Serialize(meta));
    }
}

void duckdb_web_experimental_fetch(WASMResponse* packed, ConnectionHdl connHdl) {
    try {
        auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
        auto blob = c->ExperimentalFetch();
        WASMResponseBuffer::Get().Store(*packed, std::move(blob));
    } catch (std::exception& e) {
        WireResultMetadata meta;
        meta.has_error = true;
        meta.error_message = duckdb::ErrorData(e).Message();
        WASMResponseBuffer::Get().Store(*packed, WireSerializer::Serialize(meta));
    }
}

void duckdb_web_experimental_fetch_chunk_at(WASMResponse* packed, ConnectionHdl connHdl, uint64_t chunk_idx) {
    try {
        auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
        auto blob = c->ExperimentalFetchChunkAt(chunk_idx);
        WASMResponseBuffer::Get().Store(*packed, std::move(blob));
    } catch (std::exception& e) {
        WireResultMetadata meta;
        meta.has_error = true;
        meta.error_message = duckdb::ErrorData(e).Message();
        WASMResponseBuffer::Get().Store(*packed, WireSerializer::Serialize(meta));
    }
}

void duckdb_web_experimental_interrupt(ConnectionHdl connHdl) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    c->connection().Interrupt();
}

void duckdb_web_experimental_clear_interrupt(ConnectionHdl connHdl) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    c->connection().context->ClearInterrupt();
}

}  // extern "C"
