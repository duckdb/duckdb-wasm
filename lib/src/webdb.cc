#include "duckdb/web/webdb.h"

#include <rapidjson/rapidjson.h>

#include <cstdio>
#include <duckdb/parser/parser.hpp>
#include <memory>
#include <optional>
#include <string_view>
#include <unordered_map>

#include "arrow/buffer.h"
#include "arrow/c/bridge.h"
#include "arrow/io/memory.h"
#include "arrow/ipc/options.h"
#include "arrow/ipc/writer.h"
#include "arrow/result.h"
#include "arrow/status.h"
#include "arrow/type_fwd.h"
#include "duckdb.hpp"
#include "duckdb/common/arrow.hpp"
#include "duckdb/common/file_system.hpp"
#include "duckdb/common/types/data_chunk.hpp"
#include "duckdb/main/query_result.hpp"
#include "duckdb/web/csv_table_options.h"
#include "duckdb/web/io/arrow_ifstream.h"
#include "duckdb/web/io/buffered_filesystem.h"
#include "duckdb/web/io/default_filesystem.h"
#include "duckdb/web/io/ifstream.h"
#include "duckdb/web/io/web_filesystem.h"
#include "duckdb/web/json_analyzer.h"
#include "duckdb/web/json_table.h"
#include "duckdb/web/json_table_options.h"
#include "parquet-extension.hpp"
#include "rapidjson/document.h"
#include "rapidjson/stringbuffer.h"
#include "rapidjson/writer.h"

namespace duckdb {
namespace web {

/// Get the static webdb instance
WebDB& WebDB::Get() {
    static std::unique_ptr<WebDB> db = std::make_unique<WebDB>();
    return *db;
}

/// Constructor
WebDB::Connection::Connection(WebDB& webdb) : webdb_(webdb), connection_(*webdb.database_) {}

arrow::Result<std::shared_ptr<arrow::Buffer>> WebDB::Connection::RunQuery(std::string_view text) {
    try {
        // Send the query
        auto result = connection_.SendQuery(std::string{text});
        if (!result->success) return arrow::Status{arrow::StatusCode::ExecutionError, move(result->error)};
        current_query_result_.reset();
        current_schema_.reset();

        // Configure the output writer
        ArrowSchema raw_schema;
        result->ToArrowSchema(&raw_schema);
        ARROW_ASSIGN_OR_RAISE(auto schema, arrow::ImportSchema(&raw_schema));
        ARROW_ASSIGN_OR_RAISE(auto out, arrow::io::BufferOutputStream::Create());
        ARROW_ASSIGN_OR_RAISE(auto writer, arrow::ipc::MakeFileWriter(out, schema));

        // Write chunk stream
        for (auto chunk = result->Fetch(); !!chunk && chunk->size() > 0; chunk = result->Fetch()) {
            // Import the data chunk as record batch
            ArrowArray array;
            chunk->ToArrowArray(&array);
            // Write record batch to the output stream
            ARROW_ASSIGN_OR_RAISE(auto batch, arrow::ImportRecordBatch(&array, schema));
            ARROW_RETURN_NOT_OK(writer->WriteRecordBatch(*batch));
        }
        ARROW_RETURN_NOT_OK(writer->Close());
        return out->Finish();
    } catch (std::exception& e) {
        return arrow::Status{arrow::StatusCode::ExecutionError, e.what()};
    }
}

arrow::Result<std::shared_ptr<arrow::Buffer>> WebDB::Connection::SendQuery(std::string_view text) {
    try {
        // Send the query
        auto result = connection_.SendQuery(std::string{text});
        if (!result->success) return arrow::Status{arrow::StatusCode::ExecutionError, move(result->error)};
        current_query_result_ = move(result);
        current_schema_.reset();

        // Import the schema
        ArrowSchema raw_schema;
        current_query_result_->ToArrowSchema(&raw_schema);
        ARROW_ASSIGN_OR_RAISE(current_schema_, arrow::ImportSchema(&raw_schema));

        // Serialize the schema
        return arrow::ipc::SerializeSchema(*current_schema_);
    } catch (std::exception& e) {
        return arrow::Status{arrow::StatusCode::ExecutionError, e.what()};
    }
}

arrow::Result<std::shared_ptr<arrow::Buffer>> WebDB::Connection::FetchQueryResults() {
    try {
        // Fetch data if a query is active
        std::unique_ptr<duckdb::DataChunk> chunk;
        if (current_query_result_ == nullptr) {
            return nullptr;
        }

        // Fetch next result chunk
        chunk = current_query_result_->Fetch();
        if (!current_query_result_->success) {
            return arrow::Status{arrow::StatusCode::ExecutionError, move(current_query_result_->error)};
        }

        // Reached end?
        if (!chunk) {
            current_query_result_.reset();
            current_schema_.reset();
            return nullptr;
        }

        // Serialize the record batch
        ArrowArray array;
        chunk->ToArrowArray(&array);
        ARROW_ASSIGN_OR_RAISE(auto batch, arrow::ImportRecordBatch(&array, current_schema_));
        return arrow::ipc::SerializeRecordBatch(*batch, arrow::ipc::IpcWriteOptions::Defaults());
    } catch (std::exception& e) {
        return arrow::Status{arrow::StatusCode::ExecutionError, e.what()};
    }
}

/// Import a csv file
arrow::Status WebDB::Connection::ImportCSVTable(std::string_view path, std::string_view options_json) {
    try {
        /// Read table options
        rapidjson::Document options_doc;
        options_doc.Parse(options_json.begin(), options_json.size());
        csv::TableReaderOptions options;
        ARROW_RETURN_NOT_OK(options.ReadFrom(options_doc));

        /// Get table name and schema
        auto schema_name = options.schema_name.empty() ? "main" : options.schema_name;
        if (options.table_name.empty()) return arrow::Status::Invalid("missing 'name' option");

        // TODO explicitly provided arrow types

        /// Execute the csv scan
        std::vector<Value> params;
        params.emplace_back(std::string{path});
        connection_.TableFunction("read_csv_auto", params)->Create(schema_name, options.table_name);

    } catch (const std::exception& e) {
        return arrow::Status::UnknownError(e.what());
    }
    return arrow::Status::OK();
}

/// Import a json file
arrow::Status WebDB::Connection::ImportJSONTable(std::string_view path, std::string_view options_json) {
    try {
        /// Read table options
        rapidjson::Document options_doc;
        options_doc.Parse(options_json.begin(), options_json.size());
        json::TableReaderOptions options;
        ARROW_RETURN_NOT_OK(options.ReadFrom(options_doc));

        /// Get table name and schema
        auto schema_name = options.schema_name.empty() ? "main" : options.schema_name;
        if (options.table_name.empty()) return arrow::Status::Invalid("missing 'name' option");

        // Create the input file stream
        auto ifs = std::make_unique<io::InputFileStream>(webdb_.filesystem_buffer_, path);
        // Do we need to run the analyzer?
        json::TableType table_type;
        if (!options.table_shape || options.table_shape == json::TableShape::UNRECOGNIZED) {
            io::InputFileStream ifs_copy{*ifs};
            ARROW_RETURN_NOT_OK(json::InferTableType(ifs_copy, table_type));

        } else {
            table_type.shape = *options.table_shape;
            // XXX type
        }
        // Resolve the table reader
        ARROW_ASSIGN_OR_RAISE(auto table_reader, json::TableReader::Resolve(std::move(ifs), table_type));
        /// Execute the arrow scan
        vector<Value> params;
        params.push_back(duckdb::Value::POINTER((uintptr_t)&table_reader));
        params.push_back(duckdb::Value::POINTER((uintptr_t)json::TableReader::CreateArrayStreamFromSharedPtrPtr));
        params.push_back(duckdb::Value::UBIGINT(1000000));
        connection_.TableFunction("arrow_scan", params)->Create(schema_name, options.table_name);

    } catch (const std::exception& e) {
        return arrow::Status::UnknownError(e.what());
    }
    return arrow::Status::OK();
}

/// Constructor
WebDB::WebDB(std::unique_ptr<duckdb::FileSystem> fs, const char* path)
    : filesystem_buffer_(std::make_shared<io::FileSystemBuffer>(std::move(fs))),
      database_(),
      connections_(),
      db_config_() {
    auto buffered_filesystem = std::make_unique<io::BufferedFileSystem>(filesystem_buffer_);
    db_config_.file_system = std::move(std::move(buffered_filesystem));
    db_config_.maximum_threads = 1;
    database_ = std::make_shared<duckdb::DuckDB>(path, &db_config_);
    database_->LoadExtension<duckdb::ParquetExtension>();
    zip_ = std::make_unique<Zipper>(filesystem_buffer_);
}

WebDB::~WebDB() { pinned_web_files_.clear(); }

/// Tokenize a script and return tokens as json
std::string WebDB::Tokenize(std::string_view text) {
    duckdb::Parser parser;
    auto tokens = parser.Tokenize(std::string{text});
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
    rapidjson::StringBuffer strbuf;
    rapidjson::Writer<rapidjson::StringBuffer> writer{strbuf};
    doc.Accept(writer);
    return strbuf.GetString();
}

/// Get the version
std::string_view WebDB::GetVersion() { return database_->LibraryVersion(); }

/// Create a session
WebDB::Connection* WebDB::Connect() {
    auto conn = std::make_unique<WebDB::Connection>(*this);
    auto conn_ptr = conn.get();
    connections_.insert({conn_ptr, move(conn)});
    return conn_ptr;
}

/// End a session
void WebDB::Disconnect(Connection* session) { connections_.erase(session); }

/// Flush all file buffers
void WebDB::FlushFiles() { filesystem_buffer_->Flush(); }
/// Flush file by path
void WebDB::FlushFile(std::string_view path) { filesystem_buffer_->FlushFile(path); }

/// Register a file URL
arrow::Status WebDB::RegisterFileURL(std::string_view file_name, std::string_view file_url) {
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) return arrow::Status::Invalid("WebFileSystem is not configured");
    ARROW_ASSIGN_OR_RAISE(auto file_hdl, web_fs->RegisterFileURL(file_name, file_url));
    pinned_web_files_.insert({file_hdl->GetName(), std::move(file_hdl)});
    return arrow::Status::OK();
}
/// Register a file URL
arrow::Status WebDB::RegisterFileBuffer(std::string_view file_name, std::unique_ptr<char[]> buffer,
                                        size_t buffer_length) {
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) return arrow::Status::Invalid("WebFileSystem is not configured");
    io::WebFileSystem::DataBuffer data{std::move(buffer), buffer_length};
    ARROW_ASSIGN_OR_RAISE(auto file_hdl, web_fs->RegisterFileBuffer(file_name, std::move(data)));
    pinned_web_files_.insert({file_hdl->GetName(), std::move(file_hdl)});
    return arrow::Status::OK();
}
/// Drop all files
arrow::Status WebDB::DropFiles() {
    pinned_web_files_.clear();
    return arrow::Status::OK();
}
/// Drop a file
arrow::Status WebDB::DropFile(std::string_view file_name) {
    pinned_web_files_.erase(file_name);
    return arrow::Status::OK();
}
/// Set a file descriptor
arrow::Status WebDB::SetFileDescriptor(uint32_t file_id, uint32_t fd) {
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) return arrow::Status::Invalid("WebFileSystem is not configured");
    return web_fs->SetFileDescriptor(file_id, fd);
}
/// Set a file descriptor
arrow::Result<std::string> WebDB::GetFileInfo(uint32_t file_id) {
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) return arrow::Status::Invalid("WebFileSystem is not configured");
    return web_fs->GetFileInfo(file_id);
}

/// Copy a file to a buffer
arrow::Result<std::shared_ptr<arrow::Buffer>> WebDB::CopyFileToBuffer(std::string_view path) {
    constexpr auto FLAGS = duckdb::FileFlags::FILE_FLAGS_WRITE | duckdb::FileFlags::FILE_FLAGS_FILE_CREATE;
    auto& fs = filesystem();
    auto src = fs.OpenFile(std::string{path}, FLAGS);
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
    constexpr auto FLAGS = duckdb::FileFlags::FILE_FLAGS_WRITE | duckdb::FileFlags::FILE_FLAGS_FILE_CREATE;
    auto& fs = filesystem();
    auto src = fs.OpenFile(std::string{path}, FLAGS);
    auto dst = fs.OpenFile(std::string{path}, FLAGS);

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
