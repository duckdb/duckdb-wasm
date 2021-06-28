#ifndef INCLUDE_DUCKDB_WEB_IO_WEB_FILESYSTEM_H_
#define INCLUDE_DUCKDB_WEB_IO_WEB_FILESYSTEM_H_

#include <atomic>
#include <shared_mutex>
#include <stack>

#include "arrow/io/buffered.h"
#include "arrow/result.h"
#include "arrow/status.h"
#include "duckdb/common/constants.hpp"
#include "duckdb/common/file_system.hpp"
#include "duckdb/web/io/file_stats.h"
#include "duckdb/web/io/readahead_buffer.h"
#include "duckdb/web/utils/parallel.h"
#include "duckdb/web/utils/shared_mutex.h"
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
        NATIVE = 1,
        HTTP = 3,
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
        /// The file identifier
        const uint32_t file_id_;
        /// The file path
        const std::string file_name_;
        /// The data protocol
        DataProtocol data_protocol_;
        /// The handle count
        size_t handle_count_;
        /// The file mutex
        SharedMutex file_mutex_ = {};
        /// The file size
        uint64_t file_size_ = 0;

        /// XXX Make chunked to upgrade from url to cached version
        std::optional<DataBuffer> data_buffer_ = std::nullopt;
        /// The data file descriptor (if any)
        std::optional<uint32_t> data_fd_ = std::nullopt;
        /// The data URL (if any)
        std::optional<std::string> data_url_ = std::nullopt;

       public:
        /// Constructor
        WebFile(uint32_t file_id, std::string_view file_name, DataProtocol protocol)
            : file_id_(file_id), file_name_(file_name), data_protocol_(protocol), handle_count_(0) {}

        /// Get the file info as json
        std::string GetInfoJSON() const;
        /// Get the data protocol
        auto &GetDataProtocol() const { return data_protocol_; }
        /// Get the data URL
        auto &GetDataURL() const { return data_url_; }
    };

    class WebFileHandle : public duckdb::FileHandle {
        friend class WebFileSystem;

       protected:
        /// The filesystem
        WebFileSystem &fs_;
        /// The file
        WebFile *file_;
        /// The readahead (if resolved)
        ReadAheadBuffer *readahead_;
        /// The position
        uint64_t position_;

        /// Close the file
        void Close() override;

       public:
        /// Constructor
        WebFileHandle(WebFileSystem &file_system, std::string path, WebFile &file)
            : duckdb::FileHandle(file_system, path), fs_(file_system), file_(&file), readahead_(nullptr), position_(0) {
            ++file_->handle_count_;
        }
        /// Delete copy constructor
        WebFileHandle(const WebFileHandle &) = delete;
        /// Destructor
        virtual ~WebFileHandle() { Close(); }
        /// Get the file name
        auto &GetName() const { return file_->file_name_; }
        /// Resolve readahead
        ReadAheadBuffer *ResolveReadAheadBuffer(std::shared_lock<SharedMutex> &file_guard);
    };

   protected:
    /// The filesystem mutex
    LightMutex fs_mutex_ = {};
    /// The files by id
    std::unordered_map<uint32_t, std::unique_ptr<WebFile>> files_by_id_ = {};
    /// The files by path
    std::unordered_map<std::string_view, WebFile *> files_by_name_ = {};
    /// The next file id
    uint32_t next_file_id_ = 0;
    /// The pinned files (e.g. buffers)
    std::vector<std::unique_ptr<duckdb::FileHandle>> file_handles_ = {};
    /// The thread-local readahead buffers
    std::unordered_map<uint32_t, std::unique_ptr<ReadAheadBuffer>> readahead_buffers_ = {};

    /// Allocate a file id.
    /// XXX This could of course overflow....
    /// Make this a uint64 with emscripten BigInts maybe.
    inline uint32_t AllocateFileID() { return ++next_file_id_; }
    /// Invalidate readaheads
    void InvalidateReadAheads(size_t file_id, std::unique_lock<SharedMutex> &file_guard);

   public:
    /// Constructor
    WebFileSystem();
    /// Destructor
    virtual ~WebFileSystem();
    /// Delete copy constructor
    WebFileSystem(const WebFileSystem &other) = delete;

    /// Get a file info as JSON string
    inline WebFile *GetFile(uint32_t file_id) const {
        return files_by_id_.count(file_id) ? files_by_id_.at(file_id).get() : nullptr;
    }
    /// Set a file descriptor
    arrow::Status SetFileDescriptor(uint32_t file_id, uint32_t file_descriptor);
    /// Get a file info as JSON string
    arrow::Result<std::string> GetFileInfoJSON(uint32_t file_id);
    /// Register a file URL
    arrow::Result<std::unique_ptr<WebFileHandle>> RegisterFileURL(std::string_view file_name, std::string_view file_url,
                                                                  std::optional<uint64_t> file_size);
    /// Register a file buffer
    arrow::Result<std::unique_ptr<WebFileHandle>> RegisterFileBuffer(std::string_view file_name,
                                                                     DataBuffer file_buffer);

   public:
    /// Open a file
    std::unique_ptr<duckdb::FileHandle> OpenFile(const string &url, uint8_t flags, FileLockType lock,
                                                 FileCompressionType compression) override;
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
    bool DirectoryExists(const std::string &directory) override;
    /// Create a directory if it does not exist
    void CreateDirectory(const std::string &directory) override;
    /// Recursively remove a directory and all files in it
    void RemoveDirectory(const std::string &directory) override;
    /// List files in a directory, invoking the callback method for each one with (filename, is_dir)
    bool ListFiles(const std::string &directory, const std::function<void(std::string, bool)> &callback) override;
    /// Move a file from source path to the target, StorageManager relies on this being an atomic action for ACID
    /// properties
    void MoveFile(const std::string &source, const std::string &target) override;
    /// Check if a file exists
    bool FileExists(const std::string &filename) override;
    /// Remove a file from disk
    void RemoveFile(const std::string &filename) override;
    // /// Path separator for the current file system
    // std::string PathSeparator() override;
    // /// Join two paths together
    // std::string JoinPath(const std::string &a, const std::string &path) override;
    /// Sync a file handle to disk
    void FileSync(duckdb::FileHandle &handle) override;

    /// Sets the working directory
    void SetWorkingDirectory(const std::string &path) override;
    /// Gets the working directory
    std::string GetWorkingDirectory() override;
    /// Gets the users home directory
    std::string GetHomeDirectory() override;

    /// Runs a glob on the file system, returning a list of matching files
    std::vector<std::string> Glob(const std::string &path) override;

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
};

}  // namespace io
}  // namespace web
}  // namespace duckdb

#endif
