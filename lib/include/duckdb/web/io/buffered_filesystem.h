#ifndef INCLUDE_DUCKDB_WEB_BUFFERED_FILESYSTEM_H_
#define INCLUDE_DUCKDB_WEB_BUFFERED_FILESYSTEM_H_

#include <cstddef>
#include <unordered_map>

#include "duckdb/common/constants.hpp"
#include "duckdb/common/file_system.hpp"
#include "duckdb/common/optional_ptr.hpp"
#include "duckdb/common/vector.hpp"
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

    /// Patch a filename.
    /// TODO(ankoh) This is a temporary workaround until we can disable writes to .tmp files.
    std::string_view PatchFilename(std::string_view file);
    /// Patch a filename
    std::string PatchFilenameOwned(const std::string &file);

   public:
    /// Constructor
    BufferedFileSystem(std::shared_ptr<FilePageBuffer> buffer_manager);
    /// Constructor
    BufferedFileSystem(const BufferedFileSystem &other)
        : file_page_buffer_(other.file_page_buffer_),
          filesystem_(other.filesystem_),
          file_configs_(other.file_configs_) {}
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
    /// Sync a file handle to disk
    void FileSync(duckdb::FileHandle &handle) override;

    /// Returns the file size of a file handle, returns -1 on error
    int64_t GetFileSize(duckdb::FileHandle &handle) override;
    /// Returns the file last modified time of a file handle, returns timespec with zero on all attributes on error
    timestamp_t GetLastModifiedTime(duckdb::FileHandle &handle) override;
    /// Truncate a file to a maximum size of new_size, new_size should be smaller than or equal to the current size of
    /// the file
    void Truncate(duckdb::FileHandle &handle, int64_t new_size) override;

    /// Check if a directory exists
    bool DirectoryExists(const string &directory, optional_ptr<FileOpener> opener = nullptr) override {
        return filesystem_.DirectoryExists(directory, opener);
    }
    /// Create a directory if it does not exist
    void CreateDirectory(const std::string &directory, optional_ptr<FileOpener> opener = nullptr) override {
        return filesystem_.CreateDirectory(directory, opener);
    }
    /// Recursively remove a directory and all files in it
    void RemoveDirectory(const std::string &directory, optional_ptr<FileOpener> opener = nullptr) override;
    /// List files in a directory, invoking the callback method for each one with (filename, is_dir)
    bool ListFiles(const std::string &directory, const std::function<void(const std::string &, bool)> &callback,
                   FileOpener *opener = nullptr) override {
        return filesystem_.ListFiles(directory, callback);
    }
    /// Move a file from source path to the target, StorageManager relies on this being an atomic action for ACID
    /// properties
    void MoveFile(const std::string &source, const std::string &target,
                  optional_ptr<FileOpener> opener = nullptr) override;
    /// Check if a file exists
    bool FileExists(const std::string &filename, optional_ptr<FileOpener> opener = nullptr) override {
        return filesystem_.FileExists(PatchFilenameOwned(filename), opener);
    }
    /// Remove a file from disk
    void RemoveFile(const std::string &filename, optional_ptr<FileOpener> opener = nullptr) override;

    /// Runs a glob on the file system, returning a list of matching files
    vector<OpenFileInfo> Glob(const std::string &path, FileOpener *opener = nullptr) override {
        return filesystem_.Glob(PatchFilenameOwned(path), opener);
    }

    /// Register subsystem
    void RegisterSubSystem(unique_ptr<FileSystem> sub_fs) override;
    /// Register subsystem
    void RegisterSubSystem(FileCompressionType compression_type, unique_ptr<FileSystem> sub_fs) override;

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
