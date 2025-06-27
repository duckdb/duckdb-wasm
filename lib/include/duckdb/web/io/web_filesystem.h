#ifndef INCLUDE_DUCKDB_WEB_IO_WEB_FILESYSTEM_H_
#define INCLUDE_DUCKDB_WEB_IO_WEB_FILESYSTEM_H_

#include <atomic>
#include <mutex>
#include <optional>
#include <shared_mutex>
#include <stack>

#include "arrow/io/buffered.h"
#include "arrow/result.h"
#include "arrow/status.h"
#include "duckdb/common/constants.hpp"
#include "duckdb/common/file_system.hpp"
#include "duckdb/common/vector.hpp"
#include "duckdb/web/config.h"
#include "duckdb/web/io/file_stats.h"
#include "duckdb/web/io/readahead_buffer.h"
#include "duckdb/web/utils/parallel.h"
#include "duckdb/web/utils/wasm_response.h"
#include "nonstd/span.h"

namespace duckdb {
namespace web {
namespace io {

class WebFileSystem : public duckdb::FileSystem {
   public:
    /// The data protocol
    enum DataProtocol : uint8_t {
        BUFFER = 0,
        NODE_FS = 1,
        BROWSER_FILEREADER = 2,
        BROWSER_FSACCESS = 3,
        HTTP = 4,
        S3 = 5
    };

    /// A simple buffer.
    /// It might be worth to make this chunked eventually.
    class DataBuffer {
       protected:
        /// The data
        std::unique_ptr<char[]> data_;
        /// The size
        size_t size_;
        /// The capacity
        size_t capacity_;

       public:
        /// Constructor
        DataBuffer(std::unique_ptr<char[]> data, size_t size);
        /// Get get span
        auto Get() { return nonstd::span<char>{data_.get(), size_}; }
        /// Get the capacity
        auto Capacity() { return capacity_; }
        /// Get the size
        auto Size() { return size_; }
        /// Grow the buffer so that it has a capacity of at least n
        void Resize(size_t n);
    };

    class WebFile {
        friend class WebFileSystem;

       protected:
        /// The filesystem
        WebFileSystem &filesystem_;
        /// The file identifier
        const uint32_t file_id_;
        /// The file path
        std::string file_name_;
        /// The data protocol
        DataProtocol data_protocol_;
        /// The handle count
        size_t handle_count_;
        /// The file mutex
        SharedMutex file_mutex_ = {};
        /// The file size
        std::optional<uint64_t> file_size_ = 0;
        /// The file size
        std::optional<uint64_t> last_modification_time_ = 0;

        /// XXX Make chunked to upgrade from url to cached version
        std::optional<DataBuffer> data_buffer_ = std::nullopt;
        /// The data URL (if any)
        std::optional<std::string> data_url_ = std::nullopt;

        /// Buffered http file for writing: file is a buffered HTTP/S3 and should be written to data_url_ on closing
        bool buffered_http_file_ = false;
        /// The extensionOptions at time of opening the http file as buffer
        std::optional<DuckDBConfigOptions> buffered_http_config_options_ = std::nullopt;

        /// The file stats
        std::shared_ptr<io::FileStatisticsCollector> file_stats_ = nullptr;

       public:
        /// Constructor
        WebFile(WebFileSystem &filesystem, uint32_t file_id, std::string_view file_name, DataProtocol protocol)
            : filesystem_(filesystem),
              file_id_(file_id),
              file_name_(file_name),
              data_protocol_(protocol),
              handle_count_(0) {}

        /// Close the file
        void Close();
        /// Get the file info as json
        rapidjson::Value WriteInfo(rapidjson::Document &doc) const;
        /// Get the file name
        auto &GetFileSystem() const { return filesystem_; }
        /// Get the file name
        auto &GetFileName() const { return file_name_; }
        /// Get the data protocol
        auto &GetDataProtocol() const { return data_protocol_; }
        /// Get the data URL
        auto &GetDataURL() const { return data_url_; }
    };

    class WebFileHandle : public duckdb::FileHandle {
        friend class WebFileSystem;

       protected:
        /// The file
        std::shared_ptr<WebFile> file_;
        /// The readahead (if resolved)
        ReadAheadBuffer *readahead_;
        /// The position
        std::atomic<uint64_t> position_;

        /// Close the file
        void Close() override;

       public:
        /// Constructor
        WebFileHandle(std::shared_ptr<WebFile> file)
            : duckdb::FileHandle(file->GetFileSystem(), file->GetFileName(), FileOpenFlags::FILE_FLAGS_READ),
              file_(file),
              readahead_(nullptr),
              position_(0) {
            ++file_->handle_count_;
        }
        /// Delete copy constructor
        WebFileHandle(const WebFileHandle &) = delete;
        /// Destructor
        virtual ~WebFileHandle() {
            try {
                Close();
            } catch (...) {
                // Avoid crashes if Close happens to throw
            }
        }
        /// Get the file name
        auto &GetName() const { return file_->file_name_; }
        /// Resolve readahead
        ReadAheadBuffer *ResolveReadAheadBuffer(std::shared_lock<SharedMutex> &file_guard);
    };

   protected:
    /// The config
    std::shared_ptr<WebDBConfig> config_ = {};
    /// The filesystem mutex
    LightMutex fs_mutex_ = {};
    /// The default data protocol
    DataProtocol default_data_protocol_ = DataProtocol::BUFFER;
    /// The files by id
    std::unordered_map<uint32_t, std::shared_ptr<WebFile>> files_by_id_ = {};
    /// The files by name
    std::unordered_map<std::string, std::shared_ptr<WebFile>> files_by_name_ = {};
    /// The files by url
    std::unordered_map<std::string, std::shared_ptr<WebFile>> files_by_url_ = {};
    /// The next file id
    uint32_t next_file_id_ = 0;
    /// The thread-local readahead buffers
    std::unordered_map<uint32_t, std::unique_ptr<ReadAheadBuffer>> readahead_buffers_ = {};
    /// The file statistics
    std::shared_ptr<io::FileStatisticsRegistry> file_statistics_;
    /// Cache epoch for synchronization of JS caches
    std::atomic<uint32_t> cache_epoch_ = 1;

    /// Infer the data protocol
    DataProtocol inferDataProtocol(std::string_view url) const;
    /// Allocate a file id.
    /// XXX This could of course overflow....
    /// Make this a uint64 with emscripten BigInts maybe.
    inline uint32_t AllocateFileID() { return ++next_file_id_; }
    /// Invalidate readaheads
    void InvalidateReadAheads(size_t file_id, std::unique_lock<SharedMutex> &file_guard);

   public:
    /// Constructor
    WebFileSystem(std::shared_ptr<WebDBConfig> config);
    /// Destructor
    virtual ~WebFileSystem();
    /// Delete copy constructor
    WebFileSystem(const WebFileSystem &other) = delete;

    /// Get the config
    auto Config() const { return config_; }
    /// Load the current cache epoch
    auto LoadCacheEpoch() const { return cache_epoch_.load(std::memory_order_relaxed); }
    /// Get a file info as JSON string
    inline WebFile *GetFile(uint32_t file_id) const {
        return files_by_id_.count(file_id) ? files_by_id_.at(file_id).get() : nullptr;
    }
    /// Write the global file info as a JSON
    rapidjson::Value WriteGlobalFileInfo(rapidjson::Document &doc, uint32_t cache_epoch);
    /// Write the file info as JSON
    rapidjson::Value WriteFileInfo(rapidjson::Document &doc, uint32_t file_id, uint32_t cache_epoch);
    /// Write the file info as JSON
    rapidjson::Value WriteFileInfo(rapidjson::Document &doc, std::string_view file_name, uint32_t cache_epoch);
    /// Register a file URL
    arrow::Result<std::unique_ptr<WebFileHandle>> RegisterFileURL(std::string_view file_name, std::string_view file_url,
                                                                  DataProtocol protocol);
    /// Register a file buffer
    arrow::Result<std::unique_ptr<WebFileHandle>> RegisterFileBuffer(std::string_view file_name,
                                                                     DataBuffer file_buffer);
    /// Try to drop a specific file
    bool TryDropFile(std::string_view file_name);
    /// drop a specific file
    void DropFile(std::string_view file_name);
    /// Drop all files without references (including buffers)
    void DropDanglingFiles();
    /// Configure file statistics
    void ConfigureFileStatistics(std::shared_ptr<FileStatisticsRegistry> registry);
    /// Collect file statistics
    void CollectFileStatistics(std::string_view path, std::shared_ptr<FileStatisticsCollector> collector);

    // Increment the Cache epoch, this allows detecting stale fileInfoCaches from JS
    void IncrementCacheEpoch();

   public:
    /// Open a file
    duckdb::unique_ptr<duckdb::FileHandle> OpenFile(const string &url, FileOpenFlags flags,
                                                    optional_ptr<FileOpener> opener = nullptr) override;
    /// Read exactly nr_bytes from the specified location in the file. Fails if nr_bytes could not be read. This is
    /// equivalent to calling SetFilePointer(location) followed by calling Read().
    void Read(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes, duckdb::idx_t location) override;
    /// Write exactly nr_bytes to the specified location in the file. Fails if nr_bytes could not be read. This is
    /// equivalent to calling SetFilePointer(location) followed by calling Write().
    void Write(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes, duckdb::idx_t location) override;
    /// Read nr_bytes from the specified file into the buffer, moving the file pointer forward by nr_bytes. Returns the
    /// amount of bytes read.
    int64_t Read(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes) override;
    /// Write nr_bytes from the buffer into the file, moving the file pointer forward by nr_bytes.
    int64_t Write(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes) override;

    /// Returns the file size of a file handle, returns -1 on error
    int64_t GetFileSize(duckdb::FileHandle &handle) override;
    /// Returns the file last modified time of a file handle, returns timespec with zero on all attributes on error
    time_t GetLastModifiedTime(duckdb::FileHandle &handle) override;
    /// Truncate a file to a maximum size of new_size, new_size should be smaller than or equal to the current size of
    /// the file
    void Truncate(duckdb::FileHandle &handle, int64_t new_size) override;

    /// Check if a directory exists
    bool DirectoryExists(const std::string &directory, optional_ptr<FileOpener> opener = nullptr) override;
    /// Create a directory if it does not exist
    void CreateDirectory(const std::string &directory, optional_ptr<FileOpener> opener = nullptr) override;
    /// Recursively remove a directory and all files in it
    void RemoveDirectory(const std::string &directory, optional_ptr<FileOpener> opener = nullptr) override;
    /// List files in a directory, invoking the callback method for each one with (filename, is_dir)
    bool ListFiles(const std::string &directory, const std::function<void(const std::string &, bool)> &callback,
                   FileOpener *opener = nullptr) override;
    /// Move a file from source path to the target, StorageManager relies on this being an atomic action for ACID
    /// properties
    void MoveFile(const std::string &source, const std::string &target,
                  optional_ptr<FileOpener> opener = nullptr) override;
    /// Check if a file exists
    bool FileExists(const std::string &filename, optional_ptr<FileOpener> opener = nullptr) override;
    /// Remove a file from disk
    void RemoveFile(const std::string &filename, optional_ptr<FileOpener> opener = nullptr) override;
    // /// Path separator for the current file system
    // std::string PathSeparator() override;
    // /// Join two paths together
    // std::string JoinPath(const std::string &a, const std::string &path) override;
    /// Sync a file handle to disk
    void FileSync(duckdb::FileHandle &handle) override;

    /// Runs a glob on the file system, returning a list of matching files
    vector<OpenFileInfo> Glob(const std::string &path, FileOpener *opener = nullptr) override;

    /// Set the file pointer of a file handle to a specified location. Reads and writes will happen from this location
    void Seek(FileHandle &handle, idx_t location) override;
    /// Reset a file to the beginning (equivalent to Seek(handle, 0) for simple files)
    void Reset(FileHandle &handle) override;
    /// Get the current position within the file
    idx_t SeekPosition(FileHandle &handle) override;
    /// Whether or not we can seek into the file
    bool CanSeek() override;
    /// Whether or not the FS handles plain files on disk. This is relevant for certain optimizations, as random reads
    /// in a file on-disk are much cheaper than e.g. random reads in a file over the network
    bool OnDiskFile(FileHandle &handle) override;

   public:
    /// Get a web filesystem
    static WebFileSystem *Get();

   protected:
    /// Return the name of the filesytem. Used for forming diagnosis messages.
    std::string GetName() const override;
    /// Write the s3 config to a rapidJSON value
    static rapidjson::Value writeS3Config(DuckDBConfigOptions &extension_options,
                                          rapidjson::Document::AllocatorType allocator);
};

}  // namespace io
}  // namespace web
}  // namespace duckdb

#endif
