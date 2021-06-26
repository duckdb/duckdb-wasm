#include <memory>

#include "duckdb/common/constants.hpp"
#include "duckdb/common/file_system.hpp"
#include "duckdb/web/io/web_filesystem.h"

namespace duckdb {
namespace web {
namespace io {

namespace {

class FileSystemWrapper : public io::FileSystem {
    /// The filesystem
    std::unique_ptr<duckdb::FileSystem> fs;

   public:
    /// Constructor
    FileSystemWrapper(std::unique_ptr<duckdb::FileSystem> fs) : fs(std::move(fs)) {}

   protected:
    /// Estimate the costs for accessing a file
    FileAccessCosts EstimateFileAccessCosts() override {
        return {
            .prefer_buffering = true,
            .prefer_prefetching = false,
        };
    }

   protected:
    /// Open a file
    unique_ptr<FileHandle> OpenFile(const string &path, uint8_t flags, FileLockType lock = FileLockType::NO_LOCK,
                                    FileCompressionType compression = FileCompressionType::UNCOMPRESSED) override {
        return fs->OpenFile(path, flags, lock, compression);
    }

    /// Read exactly nr_bytes from the specified location in the file. Fails if nr_bytes could not be read. This is
    /// equivalent to calling SetFilePointer(location) followed by calling Read().
    void Read(FileHandle &handle, void *buffer, int64_t nr_bytes, idx_t location) override {
        return fs->Read(handle, buffer, nr_bytes, location);
    }
    /// Write exactly nr_bytes to the specified location in the file. Fails if nr_bytes could not be read. This is
    /// equivalent to calling SetFilePointer(location) followed by calling Write().
    void Write(FileHandle &handle, void *buffer, int64_t nr_bytes, idx_t location) override {
        return fs->Write(handle, buffer, nr_bytes, location);
    }
    /// Read nr_bytes from the specified file into the buffer, moving the file pointer forward by nr_bytes. Returns the
    /// amount of bytes read.
    int64_t Read(FileHandle &handle, void *buffer, int64_t nr_bytes) override {
        return fs->Read(handle, buffer, nr_bytes);
    }
    /// Write nr_bytes from the buffer into the file, moving the file pointer forward by nr_bytes.
    int64_t Write(FileHandle &handle, void *buffer, int64_t nr_bytes) override {
        return fs->Write(handle, buffer, nr_bytes);
    }

    /// Returns the file size of a file handle, returns -1 on error
    int64_t GetFileSize(FileHandle &handle) override { return fs->GetFileSize(handle); }
    /// Returns the file last modified time of a file handle, returns timespec with zero on all attributes on error
    time_t GetLastModifiedTime(FileHandle &handle) override { return fs->GetLastModifiedTime(handle); }
    /// Truncate a file to a maximum size of new_size, new_size should be smaller than or equal to the current size of
    /// the file
    void Truncate(FileHandle &handle, int64_t new_size) override { return fs->Truncate(handle, new_size); }

    /// Check if a directory exists
    bool DirectoryExists(const string &directory) override { return fs->DirectoryExists(directory); }
    /// Create a directory if it does not exist
    void CreateDirectory(const string &directory) override { return fs->CreateDirectory(directory); }
    /// Recursively remove a directory and all files in it
    void RemoveDirectory(const string &directory) override { return fs->CreateDirectory(directory); }
    /// List files in a directory, invoking the callback method for each one with (filename, is_dir)
    bool ListFiles(const string &directory, const std::function<void(string, bool)> &callback) override {
        return fs->ListFiles(directory, callback);
    }
    /// Move a file from source path to the target, StorageManager relies on this being an atomic action for ACID
    /// properties
    void MoveFile(const string &source, const string &target) override { return fs->MoveFile(source, target); }
    /// Check if a file exists
    bool FileExists(const string &filename) override { return fs->FileExists(filename); }
    /// Remove a file from disk
    void RemoveFile(const string &filename) override { return fs->RemoveFile(filename); }
    /// Path separator for the current file system
    string PathSeparator() override { return fs->PathSeparator(); }
    /// Join two paths together
    string JoinPath(const string &a, const string &path) override { return fs->JoinPath(a, path); }
    /// Convert separators in a path to the local separators (e.g. convert "/" into \\ on windows)
    string ConvertSeparators(const string &path) override { return fs->ConvertSeparators(path); }
    /// Extract the base name of a file (e.g. if the input is lib/example.dll the base name is example)
    string ExtractBaseName(const string &path) override { return fs->ExtractBaseName(path); }
    /// Sync a file handle to disk
    void FileSync(FileHandle &handle) override { return fs->FileSync(handle); }

    /// Sets the working directory
    void SetWorkingDirectory(const string &path) override { return fs->SetWorkingDirectory(path); }
    /// Gets the working directory
    string GetWorkingDirectory() override { return fs->GetWorkingDirectory(); }
    /// Gets the users home directory
    string GetHomeDirectory() override { return fs->GetHomeDirectory(); }

    /// Runs a glob on the file system, returning a list of matching files
    vector<string> Glob(const string &path) override { return fs->Glob(path); }

    /// Returns the system-available memory in bytes
    idx_t GetAvailableMemory() override { return fs->GetAvailableMemory(); }

    /// registers a sub-file system to handle certain file name prefixes, e.g. http:// etc.
    void RegisterSubSystem(unique_ptr<duckdb::FileSystem> sub_fs) override {
        return fs->RegisterSubSystem(std::move(sub_fs));
    }

    bool CanHandleFile(const string &fpath) override { return fs->CanHandleFile(fpath); }

    /// Set the file pointer of a file handle to a specified location. Reads and writes will happen from this location
    void Seek(FileHandle &handle, idx_t location) override { return fs->Seek(handle, location); }
    /// Reset a file to the beginning (equivalent to Seek(handle, 0) for simple files)
    void Reset(FileHandle &handle) override { return fs->Reset(handle); }
    idx_t SeekPosition(FileHandle &handle) override { return fs->SeekPosition(handle); }

    /// Whether or not we can seek into the file
    bool CanSeek() override { return fs->CanSeek(); }
    /// Whether or not the FS handles plain files on disk. This is relevant for certain optimizations, as random reads
    /// in a file on-disk are much cheaper than e.g. random reads in a file over the network
    bool OnDiskFile(FileHandle &handle) override { return fs->OnDiskFile(handle); }
};

}  // namespace

/// Create the default filesystem depending on the platform
std::unique_ptr<FileSystem> CreateDefaultFileSystem() {
#ifdef EMSCRIPTEN
    return std::make_unique<WebFileSystem>();
#else
    return std::make_unique<FileSystemWrapper>(std::make_unique<duckdb::FileSystem>());
#endif
}

}  // namespace io
}  // namespace web
}  // namespace duckdb
