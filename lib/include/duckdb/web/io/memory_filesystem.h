#ifndef INCLUDE_DUCKDB_WEB_IO_MEMORY_FILESYSTEM_H_
#define INCLUDE_DUCKDB_WEB_IO_MEMORY_FILESYSTEM_H_

#include <unordered_set>

#include "arrow/status.h"
#include "duckdb/common/constants.hpp"
#include "duckdb/common/file_system.hpp"

namespace duckdb {
namespace web {
namespace io {

class MemoryFileSystem : public duckdb::FileSystem {
   protected:
    class FileHandle;

    /// A file buffer
    struct FileBuffer {
        /// The file name
        size_t file_id;
        /// The file path
        std::string file_path;
        /// The buffer
        std::vector<char> buffer;
        /// The file handles
        std::unordered_set<FileHandle *> handles;

        /// Constructor
        FileBuffer(size_t id, std::string path, std::vector<char> buffer);
    };

    /// A file handle
    class FileHandle : public duckdb::FileHandle {
        friend class MemoryFileSystem;

       protected:
        /// The filesystem
        MemoryFileSystem &file_system_;
        /// The file buffer
        FileBuffer &buffer_;
        /// The position
        size_t position_;

        /// Close the file
        void Close() override;

       public:
        /// Constructor
        FileHandle(MemoryFileSystem &file_system, FileBuffer &buffer, size_t position);
        /// Delete copy constructor
        FileHandle(const FileHandle &) = delete;
        /// Destructor
        virtual ~FileHandle() {}
    };

   public:
    /// The files
    std::unordered_map<size_t, std::unique_ptr<FileBuffer>> files = {};
    /// The file paths
    std::unordered_map<std::string_view, FileBuffer *> file_paths = {};
    /// The next file id
    size_t next_file_id = 0;

    /// Constructor
    MemoryFileSystem() {}
    /// Destructor
    virtual ~MemoryFileSystem() {}

    /// Register a file buffer
    arrow::Status RegisterFileBuffer(std::string file_name, std::vector<char> file_buffer);

    /// Open a file
    duckdb::unique_ptr<duckdb::FileHandle> OpenFile(const string &path, FileOpenFlags flags,
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
    /// Sync a file handle to disk
    void FileSync(duckdb::FileHandle &handle) override;

    /// Runs a glob on the file system, returning a list of matching files
    vector<std::string> Glob(const std::string &path, FileOpener *opener = nullptr) override;

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

   protected:
    /// Return the name of the filesytem. Used for forming diagnosis messages.
    std::string GetName() const override;
};

}  // namespace io
}  // namespace web
}  // namespace duckdb

#endif
