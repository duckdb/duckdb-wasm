#include <iostream>
#include <stdexcept>

#include "arrow/buffer.h"
#include "arrow/status.h"
#include "duckdb/web/config.h"
#include "duckdb/web/io/web_filesystem.h"
#include "duckdb/web/utils/wasm_response.h"
#include "duckdb/web/webdb.h"

using namespace duckdb::web;

extern "C" {

using ConnectionHdl = uintptr_t;
using BufferHdl = uintptr_t;

/// Clear the response buffer
void duckdb_web_clear_response() { WASMResponseBuffer::Get().Clear(); }

/// Throw a (wasm) exception
extern "C" void duckdb_web_fail_with(const char* path) { throw std::runtime_error{std::string{path}}; }

#define GET_WEBDB(PACKED)                                              \
    auto maybe_webdb = WebDB::Get();                                   \
    if (!maybe_webdb.ok()) {                                           \
        WASMResponseBuffer::Get().Store(PACKED, maybe_webdb.status()); \
        return;                                                        \
    }                                                                  \
    auto& webdb = maybe_webdb.ValueUnsafe().get();

#define GET_WEBDB_OR_RETURN(DEFAULT) \
    auto maybe_webdb = WebDB::Get(); \
    if (!maybe_webdb.ok()) {         \
        return DEFAULT;              \
    }                                \
    auto& webdb = maybe_webdb.ValueUnsafe().get();

/// Reset the database
void duckdb_web_reset(WASMResponse* packed) {
    GET_WEBDB(*packed);
    WASMResponseBuffer::Get().Store(*packed, webdb.Reset());
}

/// Create a conn
ConnectionHdl duckdb_web_connect() {
    GET_WEBDB_OR_RETURN(0);
    auto conn = reinterpret_cast<ConnectionHdl>(webdb.Connect());
    return conn;
}
/// End a conn
void duckdb_web_disconnect(ConnectionHdl connHdl) {
    GET_WEBDB_OR_RETURN();
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    webdb.Disconnect(c);
}
/// Access a buffer
void* duckdb_web_access_buffer(ConnectionHdl /*connHdl*/, BufferHdl bufferHdl) {
    return reinterpret_cast<void*>(bufferHdl);
}
/// Flush all file buffers
void duckdb_web_flush_files() {
    GET_WEBDB_OR_RETURN();
    webdb.FlushFiles();
}
/// Flush file buffer by path
void duckdb_web_flush_file(const char* path) {
    GET_WEBDB_OR_RETURN();
    webdb.FlushFile(path);
}
/// Open a database
void duckdb_web_open(WASMResponse* packed, const char* args) {
    GET_WEBDB(*packed);
    WASMResponseBuffer::Get().Store(*packed, webdb.Open(args));
}
/// Lookup global file info
void duckdb_web_get_global_file_info(WASMResponse* packed, size_t cache_epoch) {
    GET_WEBDB(*packed);
    WASMResponseBuffer::Get().Store(*packed, webdb.GetGlobalFileInfo(cache_epoch));
}
/// Collect file statistics
void duckdb_web_collect_file_stats(WASMResponse* packed, const char* file_name, bool enable) {
    GET_WEBDB(*packed);
    WASMResponseBuffer::Get().Store(*packed, webdb.CollectFileStatistics(file_name, enable));
}
/// Export file statistics
void duckdb_web_export_file_stats(WASMResponse* packed, const char* file_name) {
    GET_WEBDB(*packed);
    WASMResponseBuffer::Get().Store(*packed, webdb.ExportFileStatistics(file_name));
}
/// Drop a file
void duckdb_web_fs_drop_file(WASMResponse* packed, const char* file_name) {
    GET_WEBDB(*packed);
    WASMResponseBuffer::Get().Store(*packed, webdb.DropFile(file_name));
}
/// Drop a file
void duckdb_web_fs_drop_files(WASMResponse* packed) {
    GET_WEBDB(*packed);
    WASMResponseBuffer::Get().Store(*packed, webdb.DropFiles());
}
/// Glob file infos
void duckdb_web_fs_glob_file_infos(WASMResponse* packed, const char* file_name) {
    GET_WEBDB(*packed);
    WASMResponseBuffer::Get().Store(*packed, webdb.GlobFileInfos(std::string_view{file_name}));
}
/// Lookup file info
void duckdb_web_fs_get_file_info_by_id(WASMResponse* packed, size_t file_id, size_t cache_epoch) {
    GET_WEBDB(*packed);
    WASMResponseBuffer::Get().Store(*packed, webdb.GetFileInfo(file_id, cache_epoch));
}
/// Lookup file info
void duckdb_web_fs_get_file_info_by_name(WASMResponse* packed, const char* file_name, size_t cache_epoch) {
    GET_WEBDB(*packed);
    WASMResponseBuffer::Get().Store(*packed, webdb.GetFileInfo(std::string_view{file_name}, cache_epoch));
}
/// Register a file at a url
void duckdb_web_fs_register_file_url(WASMResponse* packed, const char* file_name, const char* file_url,
                                     uint32_t protocol, bool direct_io) {
    GET_WEBDB(*packed);
    WASMResponseBuffer::Get().Store(
        *packed,
        webdb.RegisterFileURL(file_name, file_url, static_cast<io::WebFileSystem::DataProtocol>(protocol), direct_io));
}
/// Register a file buffer
void duckdb_web_fs_register_file_buffer(WASMResponse* packed, const char* file_name, char* data, uint32_t data_length) {
    GET_WEBDB(*packed);
    auto data_ptr = std::unique_ptr<char[]>(data);
    WASMResponseBuffer::Get().Store(*packed, webdb.RegisterFileBuffer(file_name, std::move(data_ptr), data_length));
}

/// Copy file buffer to path
void duckdb_web_copy_file_to_buffer(WASMResponse* packed, const char* path) {
    GET_WEBDB(*packed);
    WASMResponseBuffer::Get().Store(*packed, webdb.CopyFileToBuffer(path));
}
/// Copy file buffer to buffer
void duckdb_web_copy_file_to_path(WASMResponse* packed, const char* path, const char* out) {
    GET_WEBDB(*packed);
    WASMResponseBuffer::Get().Store(*packed, webdb.CopyFileToPath(path, out));
}
/// Get the duckdb version
void duckdb_web_get_version(WASMResponse* packed) {
    GET_WEBDB(*packed);
    WASMResponseBuffer::Get().Store(*packed, webdb.GetVersion());
}
/// Get the duckdb feature flags
uint32_t duckdb_web_get_feature_flags() { return ResolveFeatureFlags(); }
/// Tokenize a query
void duckdb_web_tokenize(WASMResponse* packed, const char* query) {
    GET_WEBDB(*packed);
    auto tokens = webdb.Tokenize(query);
    WASMResponseBuffer::Get().Store(*packed, arrow::Result(std::move(tokens)));
}
/// Tokenize a query
void duckdb_web_tokenize_buffer(WASMResponse* packed, const uint8_t* buffer, size_t buffer_length) {
    GET_WEBDB(*packed);
    std::string_view query(reinterpret_cast<const char*>(buffer), buffer_length);
    auto tokens = webdb.Tokenize(query);
    WASMResponseBuffer::Get().Store(*packed, arrow::Result(std::move(tokens)));
}
/// Create scalar UDF queries
void duckdb_web_udf_scalar_create(WASMResponse* packed, ConnectionHdl connHdl, const char* args) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    auto r = c->CreateScalarFunction(args);
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}
/// Prepare a query statement
void duckdb_web_prepared_create(WASMResponse* packed, ConnectionHdl connHdl, const char* script) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    auto r = c->CreatePreparedStatement(script);
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}
/// Prepare a query statement
void duckdb_web_prepared_create_buffer(WASMResponse* packed, ConnectionHdl connHdl, const uint8_t* buffer,
                                       size_t buffer_length) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    std::string_view script(reinterpret_cast<const char*>(buffer), buffer_length);
    auto r = c->CreatePreparedStatement(script);
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}
/// Close a prepared statement
void duckdb_web_prepared_close(WASMResponse* packed, ConnectionHdl connHdl, size_t statement_id) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    auto r = c->ClosePreparedStatement(statement_id);
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}
/// Execute a prepared statement and fully materialize result
void duckdb_web_prepared_run(WASMResponse* packed, ConnectionHdl connHdl, size_t statement_id, const char* args_json) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    auto r = c->RunPreparedStatement(statement_id, args_json);
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}
/// Execute a prepared statement and fully materialize result
void duckdb_web_prepared_send(WASMResponse* packed, ConnectionHdl connHdl, size_t statement_id, const char* args_json) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    auto r = c->SendPreparedStatement(statement_id, args_json);
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}
/// Run a query
void duckdb_web_query_run(WASMResponse* packed, ConnectionHdl connHdl, const char* script) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    auto r = c->RunQuery(script);
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}

/// Run a query (as a buffer)
void duckdb_web_query_run_buffer(WASMResponse* packed, ConnectionHdl connHdl, const uint8_t* buffer,
                                 size_t buffer_length) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    std::string_view S(reinterpret_cast<const char*>(buffer), buffer_length);
    auto r = c->RunQuery(S);
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}
/// Start a pending query
void duckdb_web_pending_query_start(WASMResponse* packed, ConnectionHdl connHdl, const char* script,
                                    bool allow_stream_result) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    auto r = c->PendingQuery(script, allow_stream_result);
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}
/// Start a pending query
void duckdb_web_pending_query_start_buffer(WASMResponse* packed, ConnectionHdl connHdl, const uint8_t* buffer,
                                           size_t buffer_length, bool allow_stream_result) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    std::string_view S(reinterpret_cast<const char*>(buffer), buffer_length);
    auto r = c->PendingQuery(S, allow_stream_result);
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}
/// Poll a pending query
void duckdb_web_pending_query_poll(WASMResponse* packed, ConnectionHdl connHdl, const char* script) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    auto r = c->PollPendingQuery();
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}
/// Cancel a pending query
bool duckdb_web_pending_query_cancel(ConnectionHdl connHdl, const char* script) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    return c->CancelPendingQuery();
}
/// Fetch query results
void duckdb_web_query_fetch_results(WASMResponse* packed, ConnectionHdl connHdl) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    auto r = c->FetchQueryResults();
    WASMResponseBuffer::Get().Store(*packed, r);
}
/// Get table names
void duckdb_web_get_tablenames(WASMResponse* packed, ConnectionHdl connHdl, const char* query) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    auto r = c->GetTableNames(query);
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}
/// Get table names
void duckdb_web_get_tablenames_buffer(WASMResponse* packed, ConnectionHdl connHdl, const uint8_t* buffer,
                                      size_t buffer_length) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    std::string_view query(reinterpret_cast<const char*>(buffer), buffer_length);
    auto r = c->GetTableNames(query);
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}
/// Insert arrow from an ipc stream
void duckdb_web_insert_arrow_from_ipc_stream(WASMResponse* packed, ConnectionHdl connHdl, const uint8_t* buffer,
                                             size_t buffer_length, const char* options) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    auto r = c->InsertArrowFromIPCStream(nonstd::span{buffer, buffer_length}, std::string_view{options});
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}
/// Insert csv from a file
void duckdb_web_insert_csv_from_path(WASMResponse* packed, ConnectionHdl connHdl, const char* path,
                                     const char* options) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    auto r = c->InsertCSVFromPath(std::string_view{path}, std::string_view{options});
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}
/// Insert json from a file
void duckdb_web_insert_json_from_path(WASMResponse* packed, ConnectionHdl connHdl, const char* path,
                                      const char* options) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    auto r = c->InsertJSONFromPath(std::string_view{path}, std::string_view{options});
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}

static void RaiseExtensionNotLoaded(WASMResponse* packed, std::string_view ext) {
    WASMResponseBuffer::Get().Store(
        *packed, arrow::Status(arrow::StatusCode::NotImplemented, "Extension is not loaded: " + std::string{ext}));
}
}
