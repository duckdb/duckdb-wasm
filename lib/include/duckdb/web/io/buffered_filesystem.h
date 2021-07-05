#ifndef INCLUDE_DUCKDB_WEB_BUFFERED_FILESYSTEM_H_
#define INCLUDE_DUCKDB_WEB_BUFFERED_FILESYSTEM_H_

#include <cstddef>
#include <unordered_map>

#include "duckdb/common/constants.hpp"
#include "duckdb/common/file_system.hpp"
#include "duckdb/web/io/file_page_buffer.h"
#include "duckdb/web/utils/parallel.h"

namespace duckdb {
namespace web {
namespace io {

class BufferedFileHandle : public duckdb::FileHandle {
    friend class BufferedFileSystem;

   protected:
    /// The file buffers
    std::shared_ptr<FilePageBuffer::FileRef> file_ref_;
    /// The file position
    uint64_t file_position_;

    /// Close the file
    void Close() override;

   public:
    /// Constructor
    BufferedFileHandle(duckdb::FileSystem &file_system, std::shared_ptr<FilePageBuffer::FileRef> file_buffers);
    /// Move Constructor
    explicit BufferedFileHandle(BufferedFileHandle &&) = delete;
    /// Destructor
    ~BufferedFileHandle() override;

    /// Get file
    auto &GetFileHandle() { return file_ref_->GetHandle(); }
    /// Get file buffers
    auto &GetFile() { return file_ref_; }
};

class BufferedFileSystem : public duckdb::FileSystem {
   public:
    /// The file settings
    struct FileConfig {
        /// Force direct I/O?
        /// This always bypasses the page buffer.
        bool force_direct_io;
    };

   protected:
    /// The buffer manager
    std::shared_ptr<FilePageBuffer> file_page_buffer_;
    /// The inner file system
    duckdb::FileSystem &filesystem_;
    /// The filesystem mutex
    LightMutex directory_mutex_;
    /// The files that are passed through
    std::unordered_map<std::string, FileConfig> file_configs_;

   public:
    /// Constructor
    BufferedFileSystem(std::shared_ptr<FilePageBuffer> buffer_manager);
    /// Destructor
    virtual ~BufferedFileSystem() {}

    /// Pass through a file
    void RegisterFile(std::string_view file, FileConfig config = {.force_direct_io = false});
    /// Try to drop a file
    bool TryDropFile(std::string_view file);
    /// Drop a file
    void DropFiles();

   public:
    /// Open a file
    std::unique_ptr<duckdb::FileHandle> OpenFile(const string &path, uint8_t flags, FileLockType lock,
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
    /// Sync a file handle to disk
    void FileSync(duckdb::FileHandle &handle) override;

    /// Returns the file size of a file handle, returns -1 on error
    int64_t GetFileSize(duckdb::FileHandle &handle) override;
    /// Returns the file last modified time of a file handle, returns timespec with zero on all attributes on error
    time_t GetLastModifiedTime(duckdb::FileHandle &handle) override;
    /// Truncate a file to a maximum size of new_size, new_size should be smaller than or equal to the current size of
    /// the file
    void Truncate(duckdb::FileHandle &handle, int64_t new_size) override;

    /// Create a directory if it does not exist
    void CreateDirectory(const std::string &directory) override { return filesystem_.CreateDirectory(directory); }
    /// Recursively remove a directory and all files in it
    void RemoveDirectory(const std::string &directory) override;
    /// List files in a directory, invoking the callback method for each one with (filename, is_dir)
    bool ListFiles(const std::string &directory, const std::function<void(std::string, bool)> &callback) override {
        return filesystem_.ListFiles(directory, callback);
    }
    /// Move a file from source path to the target, StorageManager relies on this being an atomic action for ACID
    /// properties
    void MoveFile(const std::string &source, const std::string &target) override;
    /// Check if a file exists
    bool FileExists(const std::string &filename) override { return filesystem_.FileExists(filename); }
    /// Remove a file from disk
    void RemoveFile(const std::string &filename) override;
    /// Path separator for the current file system
    std::string PathSeparator() override { return filesystem_.PathSeparator(); }
    /// Join two paths together
    std::string JoinPath(const std::string &a, const std::string &path) override {
        return filesystem_.JoinPath(a, path);
    }

    /// Sets the working directory
    void SetWorkingDirectory(const std::string &path) override;
    /// Gets the working directory
    std::string GetWorkingDirectory() override { return filesystem_.GetWorkingDirectory(); }
    /// Gets the users home directory
    std::string GetHomeDirectory() override { return filesystem_.GetHomeDirectory(); }

    /// Runs a glob on the file system, returning a list of matching files
    std::vector<std::string> Glob(const std::string &path) override { return filesystem_.Glob(path); }

    /// Set the file pointer of a file handle to a specified location. Reads and writes will happen from this location
    void Seek(duckdb::FileHandle &handle, idx_t location) override;
    /// Reset a file to the beginning (equivalent to Seek(handle, 0) for simple files)
    void Reset(duckdb::FileHandle &handle) override;
    /// Get the current position within the file
    idx_t SeekPosition(duckdb::FileHandle &handle) override;
    /// Whether or not we can seek into the file
    bool CanSeek() override;
    /// Whether or not the FS handles plain files on disk. This is relevant for certain optimizations, as random reads
    /// in a file on-disk are much cheaper than e.g. random reads in a file over the network
    bool OnDiskFile(duckdb::FileHandle &handle) override;
};

}  // namespace io
}  // namespace web
}  // namespace duckdb

#endif
