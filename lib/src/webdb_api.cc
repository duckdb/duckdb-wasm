#include <iostream>

#include "arrow/buffer.h"
#include "arrow/status.h"
#include "duckdb/execution/operator/persistent/buffered_csv_reader.hpp"
#include "duckdb/web/wasm_response.h"
#include "duckdb/web/webdb.h"

using namespace duckdb::web;

extern "C" {

using ConnectionHdl = uintptr_t;
using BufferHdl = uintptr_t;

/// Clear the response buffer
void duckdb_web_clear_response() { WASMResponseBuffer::Get().Clear(); }

/// Create a conn
ConnectionHdl duckdb_web_connect() {
    auto conn = reinterpret_cast<ConnectionHdl>(WebDB::Get().Connect());
    return conn;
}
/// End a conn
void duckdb_web_disconnect(ConnectionHdl connHdl) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    WebDB::Get().Disconnect(c);
}
/// Access a buffer
void* duckdb_web_access_buffer(ConnectionHdl /*connHdl*/, BufferHdl bufferHdl) {
    return reinterpret_cast<void*>(bufferHdl);
}
/// Flush all file buffers
void duckdb_web_flush_files() {
    auto& webdb = WebDB::Get();
    webdb.FlushFiles();
}
/// Flush file buffer by path
void duckdb_web_flush_file(const char* path) {
    auto& webdb = WebDB::Get();
    webdb.FlushFile(path);
}
/// Drop a file
void duckdb_web_fs_drop_file(WASMResponse* packed, const char* file_name) {
    auto& webdb = WebDB::Get();
    WASMResponseBuffer::Get().Store(*packed, webdb.DropFile(file_name));
}
/// Drop a file
void duckdb_web_fs_drop_files(WASMResponse* packed) {
    auto& webdb = WebDB::Get();
    WASMResponseBuffer::Get().Store(*packed, webdb.DropFiles());
}
/// Lookup file info
void duckdb_web_fs_get_file_info(WASMResponse* packed, size_t file_id) {
    auto& webdb = WebDB::Get();
    WASMResponseBuffer::Get().Store(*packed, webdb.GetFileInfo(file_id));
}
/// Set a file descriptor of an existing file
void duckdb_web_fs_set_file_descriptor(WASMResponse* packed, uint32_t file_id, uint32_t file_descriptor) {
    auto& webdb = WebDB::Get();
    WASMResponseBuffer::Get().Store(*packed, webdb.SetFileDescriptor(file_id, file_descriptor));
}
/// Register a file at a url
void duckdb_web_fs_register_file_url(WASMResponse* packed, const char* file_name, const char* file_url) {
    auto& webdb = WebDB::Get();
    WASMResponseBuffer::Get().Store(*packed, webdb.RegisterFileURL(file_name, file_url));
}
/// Register a file buffer
void duckdb_web_fs_register_file_buffer(WASMResponse* packed, const char* file_name, char* data, uint32_t data_length) {
    auto& webdb = WebDB::Get();
    auto data_ptr = std::unique_ptr<char[]>(data);
    WASMResponseBuffer::Get().Store(*packed, webdb.RegisterFileBuffer(file_name, std::move(data_ptr), data_length));
}

/// Copy file buffer to path
void duckdb_web_copy_file_to_buffer(WASMResponse* packed, const char* path) {
    auto& webdb = WebDB::Get();
    WASMResponseBuffer::Get().Store(*packed, webdb.CopyFileToBuffer(path));
}
/// Copy file buffer to buffer
void duckdb_web_copy_file_to_path(WASMResponse* packed, const char* path, const char* out) {
    auto& webdb = WebDB::Get();
    WASMResponseBuffer::Get().Store(*packed, webdb.CopyFileToPath(path, out));
}
/// Get the duckdb version
void duckdb_web_get_version(WASMResponse* packed) {
    auto& webdb = WebDB::Get();
    WASMResponseBuffer::Get().Store(*packed, webdb.GetVersion());
}
/// Get the duckdb feature flags
uint32_t duckdb_web_get_feature_flags() { return WebDB::Get().GetFeatureFlags(); }
/// Tokenize a query
void duckdb_web_tokenize(WASMResponse* packed, const char* query) {
    auto tokens = WebDB::Get().Tokenize(query);
    WASMResponseBuffer::Get().Store(*packed, arrow::Result(std::move(tokens)));
}
/// Run a query
void duckdb_web_query_run(WASMResponse* packed, ConnectionHdl connHdl, const char* script) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    auto r = c->RunQuery(script);
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}
/// Send a query
void duckdb_web_query_send(WASMResponse* packed, ConnectionHdl connHdl, const char* script) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    auto r = c->SendQuery(script);
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}
/// Fetch query results
void duckdb_web_query_fetch_results(WASMResponse* packed, ConnectionHdl connHdl) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    auto r = c->FetchQueryResults();
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}
/// Import csv table from file
void duckdb_web_import_csv_table(WASMResponse* packed, ConnectionHdl connHdl, const char* path, const char* options) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    auto r = c->ImportCSVTable(std::string_view{path}, std::string_view{options});
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}
/// Import json table from file
void duckdb_web_import_json_table(WASMResponse* packed, ConnectionHdl connHdl, const char* path, const char* options) {
    auto c = reinterpret_cast<WebDB::Connection*>(connHdl);
    auto r = c->ImportJSONTable(std::string_view{path}, std::string_view{options});
    WASMResponseBuffer::Get().Store(*packed, std::move(r));
}

static void RaiseExtensionNotLoaded(WASMResponse* packed, std::string_view ext) {
    WASMResponseBuffer::Get().Store(
        *packed, arrow::Status(arrow::StatusCode::NotImplemented, "Extension is not loaded: " + std::string{ext}));
}

/// Load zip from file
void duckdb_web_zip_load_file(WASMResponse* packed, const char* filePath) {
    auto& webdb = WebDB::Get();
    if (!webdb.zip()) return RaiseExtensionNotLoaded(packed, "zip");
    auto archiveID = webdb.zip()->LoadFromFile(filePath);
    WASMResponseBuffer::Get().Store(*packed, archiveID);
}
/// Get the zip entry count
void duckdb_web_zip_read_entry_count(WASMResponse* packed) {
    auto& webdb = WebDB::Get();
    if (!webdb.zip()) return RaiseExtensionNotLoaded(packed, "zip");
    auto count = webdb.zip()->ReadEntryCount();
    WASMResponseBuffer::Get().Store(*packed, count);
}
/// Get the zip entry count
void duckdb_web_zip_read_entry_info(WASMResponse* packed, size_t entryID) {
    auto& webdb = WebDB::Get();
    if (!webdb.zip()) return RaiseExtensionNotLoaded(packed, "zip");
    auto entry_info = webdb.zip()->ReadEntryInfoAsJSON(entryID);
    WASMResponseBuffer::Get().Store(*packed, entry_info);
}
/// Load entry to file
void duckdb_web_zip_extract_entry_to_path(WASMResponse* packed, size_t entryID, const char* out) {
    auto& webdb = WebDB::Get();
    if (!webdb.zip()) return RaiseExtensionNotLoaded(packed, "zip");
    auto bytes = webdb.zip()->ExtractEntryToPath(entryID, out);
    WASMResponseBuffer::Get().Store(*packed, bytes);
}

/// Extract file to file
void duckdb_web_zip_extract_path_to_path(WASMResponse* packed, const char* path, const char* out) {
    auto& webdb = WebDB::Get();
    if (!webdb.zip()) return RaiseExtensionNotLoaded(packed, "zip");
    auto bytes = webdb.zip()->ExtractPathToPath(path, out);
    WASMResponseBuffer::Get().Store(*packed, bytes);
}
}
