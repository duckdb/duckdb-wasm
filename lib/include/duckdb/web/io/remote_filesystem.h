#ifndef INCLUDE_DUCKDB_WEB_IO_REMOTE_FILESYSTEM_H_
#define INCLUDE_DUCKDB_WEB_IO_REMOTE_FILESYSTEM_H_

#include <string>

#include "duckdb/common/file_system.hpp"
#include "duckdb/web/io/buffered_filesystem.h"

namespace duckdb {
namespace web {
namespace io {

/// Remote files (http://, s3://, ...) are read by the web file system. DuckDB's virtual file system only routes
/// such paths to a sub file system that claims them, otherwise it insists on the httpfs extension. This sub file
/// system claims the remote prefixes and forwards everything to the web file system, which also is the default
/// file system of the database.
class RemoteWebFileSystem : public duckdb::FileSystem {
   protected:
    /// The web file system
    BufferedFileSystem &filesystem_;

   public:
    /// Constructor
    explicit RemoteWebFileSystem(BufferedFileSystem &filesystem) : filesystem_(filesystem) {}

    /// Claims the paths that DuckDB would otherwise hand to httpfs
    bool CanHandleFile(const string &path) override { return FileSystem::IsRemoteFile(path); }
    /// Get the name
    std::string GetName() const override { return "RemoteWebFileSystem"; }

    duckdb::unique_ptr<duckdb::FileHandle> OpenFile(const string &path, FileOpenFlags flags,
                                                    optional_ptr<FileOpener> opener = nullptr) override {
        return filesystem_.OpenFile(path, flags, opener);
    }
    bool DirectoryExists(const string &directory, optional_ptr<FileOpener> opener = nullptr) override {
        return filesystem_.DirectoryExists(directory, opener);
    }
    void CreateDirectory(const string &directory, optional_ptr<FileOpener> opener = nullptr) override {
        filesystem_.CreateDirectory(directory, opener);
    }
    void RemoveDirectory(const string &directory, optional_ptr<FileOpener> opener = nullptr) override {
        filesystem_.RemoveDirectory(directory, opener);
    }
    bool ListFiles(const string &directory, const std::function<void(const string &, bool)> &callback,
                   FileOpener *opener = nullptr) override {
        return filesystem_.ListFiles(directory, callback, opener);
    }
    void MoveFile(const string &source, const string &target, optional_ptr<FileOpener> opener = nullptr) override {
        filesystem_.MoveFile(source, target, opener);
    }
    bool FileExists(const string &filename, optional_ptr<FileOpener> opener = nullptr) override {
        return filesystem_.FileExists(filename, opener);
    }
    void RemoveFile(const string &filename, optional_ptr<FileOpener> opener = nullptr) override {
        filesystem_.RemoveFile(filename, opener);
    }
    vector<OpenFileInfo> Glob(const string &path, FileOpener *opener = nullptr) override {
        return filesystem_.Glob(path, opener);
    }
    string CanonicalizePath(const string &path, optional_ptr<FileOpener> opener = nullptr) override {
        return filesystem_.CanonicalizePath(path, opener);
    }
    bool CanSeek() override { return filesystem_.CanSeek(); }

    // Handle operations: DuckDB's caching file system wrapper routes them through the file system it wrapped
    void Read(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes, idx_t location) override {
        filesystem_.Read(handle, buffer, nr_bytes, location);
    }
    void Write(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes, idx_t location) override {
        filesystem_.Write(handle, buffer, nr_bytes, location);
    }
    int64_t Read(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes) override {
        return filesystem_.Read(handle, buffer, nr_bytes);
    }
    int64_t Write(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes) override {
        return filesystem_.Write(handle, buffer, nr_bytes);
    }
    int64_t GetFileSize(duckdb::FileHandle &handle) override { return filesystem_.GetFileSize(handle); }
    timestamp_t GetLastModifiedTime(duckdb::FileHandle &handle) override {
        return filesystem_.GetLastModifiedTime(handle);
    }
    void FileSync(duckdb::FileHandle &handle) override { filesystem_.FileSync(handle); }
    void Truncate(duckdb::FileHandle &handle, int64_t new_size) override { filesystem_.Truncate(handle, new_size); }
    void Seek(duckdb::FileHandle &handle, idx_t location) override { filesystem_.Seek(handle, location); }
    void Reset(duckdb::FileHandle &handle) override { filesystem_.Reset(handle); }
    idx_t SeekPosition(duckdb::FileHandle &handle) override { return filesystem_.SeekPosition(handle); }
    bool OnDiskFile(duckdb::FileHandle &handle) override { return filesystem_.OnDiskFile(handle); }
};

}  // namespace io
}  // namespace web
}  // namespace duckdb

#endif
