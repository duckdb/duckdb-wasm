#ifndef INCLUDE_DUCKDB_WEB_WEBDB_H_
#define INCLUDE_DUCKDB_WEB_WEBDB_H_

#include <cstring>
#include "duckdb/web/status.h"
#include <duckdb/main/query_result.hpp>
#include <duckdb/main/query_result_stream.hpp>
#include <duckdb/main/prepared_statement.hpp>
#include <initializer_list>
#include <stdexcept>
#include <string>
#include <string_view>
#include <unordered_map>

#include "duckdb.hpp"
#include "duckdb/common/file_system.hpp"
#include "duckdb/main/query_result.hpp"
#include "duckdb/parser/parser.hpp"
#include "duckdb/web/arrow_insert_options.h"
#include "duckdb/web/arrow_ipc_writer.h"
#include "duckdb/web/config.h"
#include "duckdb/web/environment.h"
#include "duckdb/web/io/buffered_filesystem.h"
#include "duckdb/web/io/file_page_buffer.h"
#include "duckdb/web/io/file_stats.h"
#include "duckdb/web/io/web_filesystem.h"
#include "duckdb/web/udf.h"
#include "nonstd/span.h"

namespace duckdb {
namespace web {


struct DuckDBWasmResultsWrapper {
    // Additional ResponseStatuses to be >= 256, and mirrored to packages/duckdb-wasm/src/status.ts
    // Missing mapping result in a throw, but they should eventually align (it's fine if typescript side only has a
    // subset)
    enum ResponseStatus : uint32_t { ARROW_BUFFER = 0, MAX_ARROW_ERROR = 255, DUCKDB_WASM_RETRY = 256 };
    DuckDBWasmResultsWrapper(web::Result<std::shared_ptr<web::Buffer>> res,
                             ResponseStatus status = ResponseStatus::ARROW_BUFFER)
        : arrow_buffer(res), status(status) {}
    DuckDBWasmResultsWrapper(web::Status res, ResponseStatus status = ResponseStatus::ARROW_BUFFER)
        : arrow_buffer(res), status(status) {}
    DuckDBWasmResultsWrapper(ResponseStatus status = ResponseStatus::ARROW_BUFFER)
        : DuckDBWasmResultsWrapper(nullptr, status) {}
    web::Result<std::shared_ptr<web::Buffer>> arrow_buffer;
    ResponseStatus status;
};

class WebDB {
   public:
    /// A connection
    class Connection {
        friend WebDB;

       protected:
        /// The webdb
        WebDB& webdb_;
        /// The connection
        duckdb::Connection connection_;

        /// The statements extracted from the text passed to PendingQuery
        std::vector<duckdb::unique_ptr<duckdb::SQLStatement>> current_pending_statements_;
        /// The index of the currently-running statement (in the above list)
        size_t current_pending_statement_index_ = 0;
        /// The value of allow_stream_result passed to PendingQuery
        bool current_allow_stream_result_ = false;
        /// The current pending query result (if any)
        duckdb::unique_ptr<duckdb::QueryResult> current_pending_query_result_ = nullptr;
        /// The current pending query was canceled
        bool current_pending_query_was_canceled_ = false;
        /// The current retained query result (if any)
        duckdb::unique_ptr<duckdb::QueryResult> current_query_result_ = nullptr;
        /// The current streamed query result (if any)
        duckdb::unique_ptr<duckdb::QueryResultStream<>> current_query_stream_ = nullptr;
        /// The IPC writer of the current streamed result (if any)
        std::unique_ptr<ArrowIPCWriter> current_ipc_writer_ = nullptr;

        /// The currently active prepared statements
        std::unordered_map<size_t, duckdb::unique_ptr<duckdb::PreparedStatement>> prepared_statements_ = {};
        /// The next prepared statement id
        size_t next_prepared_statement_id_ = 0;
        /// The current arrow ipc input stream
        std::optional<ArrowInsertOptions> arrow_insert_options_ = std::nullopt;
        /// The buffered arrow ipc input stream, until its end
        std::vector<uint8_t> arrow_ipc_stream_;
        /// The number of buffered bytes already known to hold complete messages
        size_t arrow_ipc_stream_scanned_ = 0;

        // Fully materialize a given result set and return it as an Arrow Buffer
        web::Result<std::shared_ptr<web::Buffer>> MaterializeQueryResult(
            duckdb::unique_ptr<duckdb::QueryResult> result);
        // Setup streaming of a result set and return the schema as an Arrow Buffer
        web::Result<std::shared_ptr<web::Buffer>> StreamQueryResult(duckdb::unique_ptr<duckdb::QueryResult> result);
        // Execute a prepared statement by setting up all arguments and returning the query result
        web::Result<duckdb::unique_ptr<duckdb::QueryResult>> ExecutePreparedStatement(size_t statement_id,
                                                                                        std::string_view args_json,
                                                                                        bool allow_stream_result);
        // Submit the pending statement at current_pending_statement_index_
        web::Status SubmitPendingStatement();
        // Call scalar UDF function
        web::Status CallScalarUDFFunction(UDFFunctionDeclaration& function, DataChunk& chunk, ExpressionState& state,
                                            Vector& vec);

       public:
        /// Constructor
        Connection(WebDB& webdb);
        /// Destructor
        ~Connection();

        /// Get a connection
        auto& connection() { return connection_; }
        /// Get the filesystem
        duckdb::FileSystem& filesystem();

        /// Run a query and return the materialized query result
        web::Result<std::shared_ptr<web::Buffer>> RunQuery(std::string_view text);
        /// Execute a query as pending query and return the stream schema when finished
        web::Result<std::shared_ptr<web::Buffer>> PendingQuery(std::string_view text, bool allow_stream_result);
        /// Poll a pending query and return the schema when finished
        web::Result<std::shared_ptr<web::Buffer>> PollPendingQuery();
        /// Cancel a pending query
        bool CancelPendingQuery();
        /// Fetch a data chunk from a pending query
        DuckDBWasmResultsWrapper FetchQueryResults();
        /// Get table names
        web::Result<std::string> GetTableNames(std::string_view text);

        /// Prepare a statement and return its identifier
        web::Result<size_t> CreatePreparedStatement(std::string_view text);
        /// Execute a prepared statement with the given parameters in stringifed json format and return full result
        web::Result<std::shared_ptr<web::Buffer>> RunPreparedStatement(size_t statement_id,
                                                                           std::string_view args_json);
        /// Execute a prepared statement with the given parameters in stringifed json format and stream result
        web::Result<std::shared_ptr<web::Buffer>> SendPreparedStatement(size_t statement_id,
                                                                            std::string_view args_json);
        /// Close a prepared statement by its identifier
        web::Status ClosePreparedStatement(size_t statement_id);

        /// Create a scalar function
        web::Status CreateScalarFunction(std::string_view args_json);

        /// Insert an arrow record batch from an IPC stream
        web::Status InsertArrowFromIPCStream(nonstd::span<const uint8_t> stream, std::string_view options);
        /// Insert csv data from a path
        web::Status InsertCSVFromPath(std::string_view path, std::string_view options);
        /// Insert json data from a path
        web::Status InsertJSONFromPath(std::string_view path, std::string_view options);
    };

   protected:
    /// The config
    std::shared_ptr<WebDBConfig> config_;
    /// The buffer manager
    std::shared_ptr<io::FilePageBuffer> file_page_buffer_;
    /// The buffered filesystem
    io::BufferedFileSystem* buffered_filesystem_;
    /// The (shared) database
    duckdb::shared_ptr<duckdb::DuckDB> database_;
    /// The connections
    std::unordered_map<Connection*, duckdb::unique_ptr<Connection>> connections_;

    /// The file statistics (if any)
    std::shared_ptr<io::FileStatisticsRegistry> file_stats_ = {};
    /// The pinned web files (if any)
    std::unordered_map<std::string_view, std::unique_ptr<io::WebFileSystem::WebFileHandle>> pinned_web_files_ = {};

    // Register custom extension options in DuckDB for options that are handled in DuckDB-WASM instead of DuckDB
    void RegisterCustomExtensionOptions(duckdb::shared_ptr<duckdb::DuckDB> database);

   public:
    /// Constructor
    WebDB(WebTag);
    /// Constructor
    WebDB(NativeTag, duckdb::unique_ptr<duckdb::FileSystem> fs = duckdb::FileSystem::CreateLocal());
    /// Destructor
    ~WebDB();

    /// Get the filesystem
    auto& filesystem() { return database_->GetFileSystem(); }
    /// Get the database
    auto& database() { return *database_; }
    /// Get the buffer manager
    auto& file_page_buffer() { return *file_page_buffer_; }

    /// Get the version
    std::string_view GetVersion();

    /// Tokenize a script and return tokens as json
    std::string Tokenize(std::string_view text);

    /// Create a connection
    Connection* Connect();
    /// End a connection
    void Disconnect(Connection* connection);
    /// Reset the database
    web::Status Reset();
    /// Open a database
    web::Status Open(std::string_view args_json = "");

    /// Register a file URL
    web::Status RegisterFileURL(std::string_view file_name, std::string_view file_url,
                                  io::WebFileSystem::DataProtocol protocol, bool direct_io);
    /// Register a file URL
    web::Status RegisterFileBuffer(std::string_view file_name, std::unique_ptr<char[]> buffer, size_t buffer_length);
    /// Glob all known file infos
    web::Result<std::string> GlobFileInfos(std::string_view expression);
    /// Get the global filesystem info
    web::Result<std::string> GetGlobalFileInfo(uint32_t cache_epoch);
    /// Get the file info as JSON
    web::Result<std::string> GetFileInfo(uint32_t file_id, uint32_t cache_epoch);
    /// Get the file info as JSON
    web::Result<std::string> GetFileInfo(std::string_view file_name, uint32_t cache_epoch);
    /// Flush all file buffers
    void FlushFiles();
    /// Flush file by path
    void FlushFile(std::string_view path);
    /// Drop all files
    web::Status DropFiles();
    /// Drop a file
    web::Status DropFile(std::string_view file_name);
    /// Copy a file to a buffer
    web::Result<std::shared_ptr<web::Buffer>> CopyFileToBuffer(std::string_view path);
    /// Copy a file to a path
    web::Status CopyFileToPath(std::string_view path, std::string_view out);

    /// Collect file statistics
    web::Status CollectFileStatistics(std::string_view path, bool enable);
    /// Export file statistics
    web::Result<std::shared_ptr<web::Buffer>> ExportFileStatistics(std::string_view path);

    /// Get the static webdb instance
    static web::Result<std::reference_wrapper<WebDB>> Get();
    /// Create the default webdb database
    static duckdb::unique_ptr<WebDB> Create();
};

}  // namespace web
}  // namespace duckdb

#endif  // INCLUDE_DUCKDB_WEB_WEBDB_H_
