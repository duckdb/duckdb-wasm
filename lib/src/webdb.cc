#include "duckdb/web/webdb.h"

#include <cstddef>
#include <cstdio>
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
#include "arrow/c/bridge.h"
#include "arrow/io/memory.h"
#include "arrow/ipc/options.h"
#include "arrow/ipc/writer.h"
#include "arrow/record_batch.h"
#include "arrow/result.h"
#include "arrow/status.h"
#include "arrow/type_fwd.h"
#include "duckdb.hpp"
#include "duckdb/common/arrow.hpp"
#include "duckdb/common/file_system.hpp"
#include "duckdb/common/types/data_chunk.hpp"
#include "duckdb/main/query_result.hpp"
#include "duckdb/parser/parser.hpp"
#include "duckdb/web/arrow_casts.h"
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
#include "rapidjson/error/en.h"
#include "rapidjson/rapidjson.h"
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

arrow::Result<std::shared_ptr<arrow::Buffer>> WebDB::Connection::MaterializeQueryResult(
    std::unique_ptr<duckdb::QueryResult> result) {
    current_query_result_.reset();
    current_schema_.reset();
    current_schema_patched_.reset();

    // Configure the output writer
    ArrowSchema raw_schema;
    result->ToArrowSchema(&raw_schema);
    ARROW_ASSIGN_OR_RAISE(auto schema, arrow::ImportSchema(&raw_schema));

    // Patch the schema (if necessary)
    std::shared_ptr<arrow::Schema> patched_schema = schema;
    if (!webdb_.config_.emit_bigint) {
        patched_schema = patchSchema(schema, webdb_.config_);
    }

    // Create the file writer
    ARROW_ASSIGN_OR_RAISE(auto out, arrow::io::BufferOutputStream::Create());
    ARROW_ASSIGN_OR_RAISE(auto writer, arrow::ipc::MakeFileWriter(out, patched_schema));

    // Write chunk stream
    for (auto chunk = result->Fetch(); !!chunk && chunk->size() > 0; chunk = result->Fetch()) {
        // Import the data chunk as record batch
        ArrowArray array;
        chunk->ToArrowArray(&array);
        // Import the record batch
        ARROW_ASSIGN_OR_RAISE(auto batch, arrow::ImportRecordBatch(&array, schema));
        // Patch the record batch
        ARROW_ASSIGN_OR_RAISE(batch, patchRecordBatch(batch, patched_schema, webdb_.config_));
        // Write the record batch
        ARROW_RETURN_NOT_OK(writer->WriteRecordBatch(*batch));
    }
    ARROW_RETURN_NOT_OK(writer->Close());
    return out->Finish();
}

arrow::Result<std::shared_ptr<arrow::Buffer>> WebDB::Connection::StreamQueryResult(
    std::unique_ptr<duckdb::QueryResult> result) {
    current_query_result_ = move(result);
    current_schema_.reset();
    current_schema_patched_.reset();

    // Import the schema
    ArrowSchema raw_schema;
    current_query_result_->ToArrowSchema(&raw_schema);
    ARROW_ASSIGN_OR_RAISE(current_schema_, arrow::ImportSchema(&raw_schema));

    // Patch the schema (if necessary)
    current_schema_patched_ = current_schema_;
    if (!webdb_.config_.emit_bigint) {
        current_schema_patched_ = patchSchema(current_schema_, webdb_.config_);
    }
    // Serialize the schema
    return arrow::ipc::SerializeSchema(*current_schema_patched_);
}

arrow::Result<std::shared_ptr<arrow::Buffer>> WebDB::Connection::RunQuery(std::string_view text) {
    try {
        // Send the query
        auto result = connection_.SendQuery(std::string{text});
        if (!result->success) return arrow::Status{arrow::StatusCode::ExecutionError, move(result->error)};
        return MaterializeQueryResult(std::move(result));
    } catch (std::exception& e) {
        return arrow::Status{arrow::StatusCode::ExecutionError, e.what()};
    }
}

arrow::Result<std::shared_ptr<arrow::Buffer>> WebDB::Connection::SendQuery(std::string_view text) {
    try {
        // Send the query
        auto result = connection_.SendQuery(std::string{text});
        if (!result->success) return arrow::Status{arrow::StatusCode::ExecutionError, move(result->error)};
        return StreamQueryResult(std::move(result));
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
            current_schema_patched_.reset();
            return nullptr;
        }

        // Serialize the record batch
        ArrowArray array;
        chunk->ToArrowArray(&array);
        ARROW_ASSIGN_OR_RAISE(auto batch, arrow::ImportRecordBatch(&array, current_schema_));
        // Patch the record batch
        ARROW_ASSIGN_OR_RAISE(batch, patchRecordBatch(batch, current_schema_patched_, webdb_.config_));
        // Serialize the record batch
        return arrow::ipc::SerializeRecordBatch(*batch, arrow::ipc::IpcWriteOptions::Defaults());
    } catch (std::exception& e) {
        return arrow::Status{arrow::StatusCode::ExecutionError, e.what()};
    }
}

arrow::Result<size_t> WebDB::Connection::CreatePreparedStatement(std::string_view text) {
    try {
        auto prep = connection_.Prepare(std::string{text});
        if (!prep->success) return arrow::Status{arrow::StatusCode::ExecutionError, prep->error};
        auto id = prepared_statements_counter_++;

        // Wrap around if maximum exceeded
        if (prepared_statements_counter_ == std::numeric_limits<size_t>::max()) prepared_statements_counter_ = 0;

        prepared_statements_.emplace(id, std::move(prep));
        return id;
    } catch (std::exception& e) {
        return arrow::Status{arrow::StatusCode::ExecutionError, e.what()};
    }
}

arrow::Result<std::unique_ptr<duckdb::QueryResult>> WebDB::Connection::ExecutePreparedStatement(
    size_t statement_id, std::string_view args_json) {
    try {
        auto stmt = prepared_statements_.find(statement_id);
        if (stmt == prepared_statements_.end())
            return arrow::Status{arrow::StatusCode::KeyError, "No prepared statement found with ID"};

        rapidjson::Document args_doc;
        rapidjson::ParseResult ok = args_doc.Parse(args_json.begin(), args_json.size());
        if (!ok) return arrow::Status{arrow::StatusCode::Invalid, rapidjson::GetParseError_En(ok.Code())};
        if (!args_doc.IsArray()) return arrow::Status{arrow::StatusCode::Invalid, "Arguments must be given as array"};

        std::vector<duckdb::Value> values;
        size_t index = 0;
        for (const auto& v : args_doc.GetArray()) {
            if (v.IsLosslessDouble())
                values.emplace_back(v.GetDouble());
            else if (v.IsString())
                values.emplace_back(v.GetString());
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
        if (!result->success) return arrow::Status{arrow::StatusCode::ExecutionError, move(result->error)};
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
        auto ifs = std::make_unique<io::InputFileStream>(webdb_.file_page_buffer_, path);
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
WebDB::WebDB(std::string_view path, std::unique_ptr<duckdb::FileSystem> fs)
    : file_page_buffer_(std::make_shared<io::FilePageBuffer>(std::move(fs))),
      database_(),
      connections_(),
      file_stats_(std::make_shared<io::FileStatisticsRegistry>()),
      zip_(std::make_unique<Zipper>(file_page_buffer_)),
      config_() {
    file_page_buffer_->ConfigureFileStatistics(file_stats_);
    if (auto webfs = io::WebFileSystem::Get()) {
        webfs->ConfigureFileStatistics(file_stats_);
    }
    if (auto open_status = Open(path); !open_status.ok()) {
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
/// Get feature flags
uint32_t WebDB::GetFeatureFlags() {
    auto flags = STATIC_WEBDB_FEATURES;
    if (config_.emit_bigint) {
        flags |= 1 << WebDBFeature::EMIT_BIGINT;
    }
    return flags;
}

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
void WebDB::FlushFiles() { file_page_buffer_->FlushFiles(); }
/// Flush file by path
void WebDB::FlushFile(std::string_view path) { file_page_buffer_->FlushFile(path); }

/// Reset the database
arrow::Status WebDB::Reset() { return Open(""); }
/// Open a database
arrow::Status WebDB::Open(std::string_view args_json) {
    config_ = WebDBConfig::ReadFrom(args_json);
    bool in_memory = config_.path == ":memory:";
    try {
        // Setup new database
        auto buffered_fs = std::make_unique<io::BufferedFileSystem>(file_page_buffer_);
        auto buffered_fs_ptr = buffered_fs.get();

        duckdb::DBConfig db_config;
        db_config.file_system = std::move(buffered_fs);
        db_config.maximum_threads = 1;
        db_config.access_mode = in_memory ? AccessMode::UNDEFINED : AccessMode::READ_ONLY;

        auto db = std::make_shared<duckdb::DuckDB>(config_.path, &db_config);
        db->LoadExtension<duckdb::ParquetExtension>();

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
                                     std::optional<uint64_t> file_size) {
    // No web filesystem configured?
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) return arrow::Status::Invalid("WebFileSystem is not configured");
    // Already pinned by us?
    // Unpin the file to re-register the new file.
    if (auto iter = pinned_web_files_.find(file_name); iter != pinned_web_files_.end()) {
        pinned_web_files_.erase(iter);
    }
    // Try to drop the file in the buffered file system.
    // If that fails we have to give up since someone still holds an open file ref.
    if (!buffered_filesystem_->TryDropFile(file_name)) {
        return arrow::Status::Invalid("File is already registered and is still buffered");
    }
    // Try to drop the file in the web file system
    if (!web_fs->TryDropFile(file_name)) {
        return arrow::Status::Invalid("File is already registered and is in use");
    }
    // Register new file url in web filesystem.
    // Pin the file handle to keep the file alive.
    ARROW_ASSIGN_OR_RAISE(auto file_hdl, web_fs->RegisterFileURL(file_name, file_url, file_size));
    pinned_web_files_.insert({file_hdl->GetName(), std::move(file_hdl)});
    return arrow::Status::OK();
}
/// Register a file URL
arrow::Status WebDB::RegisterFileBuffer(std::string_view file_name, std::unique_ptr<char[]> buffer,
                                        size_t buffer_length) {
    // No web filesystem configured?
    auto web_fs = io::WebFileSystem::Get();
    if (!web_fs) return arrow::Status::Invalid("WebFileSystem is not configured");
    // Already pinned by us?
    // Unpin the file to re-register the new file.
    if (auto iter = pinned_web_files_.find(file_name); iter != pinned_web_files_.end()) {
        pinned_web_files_.erase(iter);
    }
    // Try to drop the file in the buffered file system.
    // If that fails we have to give up since someone still holds an open file ref.
    if (!buffered_filesystem_->TryDropFile(file_name)) {
        return arrow::Status::Invalid("File is already registered and is still buffered");
    }
    // Try to drop the file in the web file system
    if (!web_fs->TryDropFile(file_name)) {
        return arrow::Status::Invalid("File is already registered and is in use");
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
    return web_fs->GetFileInfoJSON(file_id);
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
