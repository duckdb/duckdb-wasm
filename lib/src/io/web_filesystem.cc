#include "duckdb/web/io/web_filesystem.h"

#include <iostream>
#include <string>
#include <vector>

#include "duckdb/common/file_system.hpp"
#include "duckdb/web/io/web_filesystem.h"

static const std::function<void(std::string, bool)> *list_files_callback = {};
static std::vector<std::string> *glob_results = {};

#ifdef EMSCRIPTEN
extern "C" {
extern size_t duckdb_web_fs_file_open(const char *path, size_t pathLen, uint8_t flags);
extern void duckdb_web_fs_file_close(size_t fileId);
extern void duckdb_web_fs_file_truncate(size_t fileId, double newSize);
extern time_t duckdb_web_fs_file_get_last_modified_time(size_t fileId);
extern double duckdb_web_fs_file_get_size(size_t fileId);
extern ssize_t duckdb_web_fs_read(size_t fileId, void *buffer, ssize_t bytes, double location);
extern ssize_t duckdb_web_fs_write(size_t fileId, void *buffer, ssize_t bytes, double location);

extern void duckdb_web_fs_directory_remove(const char *path, size_t pathLen);
extern bool duckdb_web_fs_directory_exists(const char *path, size_t pathLen);
extern void duckdb_web_fs_directory_create(const char *path, size_t pathLen);
extern bool duckdb_web_fs_directory_list_files(const char *path, size_t pathLen);

extern void duckdb_web_fs_glob(const char *path, size_t pathLen);

void duckdb_web_fs_directory_list_files_callback(const char *path, size_t pathLen, bool is_dir) {
    (*list_files_callback)(std::string(path, pathLen), is_dir);
}
void duckdb_web_fs_glob_callback(const char *path, size_t pathLen) { glob_results->emplace_back(path, pathLen); }

extern void duckdb_web_fs_file_move(const char *from, size_t fromLen, const char *to, size_t toLen);
extern bool duckdb_web_fs_file_exists(const char *path, size_t pathLen);
extern bool duckdb_web_fs_file_remove(const char *path, size_t pathLen);
}
#else
extern "C" {
size_t duckdb_web_fs_file_open(const char *path, size_t pathLen, uint8_t flags) { return 0; }
void duckdb_web_fs_file_close(size_t fileId) {}
void duckdb_web_fs_file_truncate(size_t fileId, double newSize) {}
time_t duckdb_web_fs_file_get_last_modified_time(size_t fileId) { return 0; }
double duckdb_web_fs_file_get_size(size_t fileId) { return 0; }
ssize_t duckdb_web_fs_read(size_t fileId, void *buffer, ssize_t bytes, double location) { return 0; }
ssize_t duckdb_web_fs_write(size_t fileId, void *buffer, ssize_t bytes, double location) { return 0; }
void duckdb_web_fs_file_sync(size_t fileId) {}

bool duckdb_web_fs_directory_exists(const char *path, size_t pathLen) { return {}; };
void duckdb_web_fs_directory_create(const char *path, size_t pathLen) {}
void duckdb_web_fs_directory_remove(const char *path, size_t pathLen) {}
bool duckdb_web_fs_directory_list_files(const char *path, size_t pathLen) { return {}; }
void duckdb_web_fs_glob(const char *path, size_t pathLen) {}

void duckdb_web_fs_file_move(const char *from, size_t fromLen, const char *to, size_t toLen) {}
bool duckdb_web_fs_file_exists(const char *path, size_t pathLen) { return {}; };
bool duckdb_web_fs_file_remove(const char *path, size_t pathLen) { return {}; };
}
#endif

namespace duckdb {
namespace web {
namespace io {

void WebFileHandle::Close() { duckdb_web_fs_file_close(file_id); }

/// Open a file
std::unique_ptr<duckdb::FileHandle> WebFileSystem::OpenFile(const string &path, uint8_t flags, FileLockType lock,
                                                            FileCompressionType compression) {
    return std::make_unique<WebFileHandle>(*this, std::string(path),
                                           duckdb_web_fs_file_open(path.data(), path.length(), flags));
}

/// Read exactly nr_bytes from the specified location in the file. Fails if nr_bytes could not be read.
void WebFileSystem::Read(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes, duckdb::idx_t location) {
    assert(nr_bytes < std::numeric_limits<size_t>::max());
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    auto n = duckdb_web_fs_read(file_hdl.file_id, buffer, nr_bytes, location);
    file_hdl.position_ = location + n;
}
/// Write exactly nr_bytes to the specified location in the file. Fails if nr_bytes could not be read.
void WebFileSystem::Write(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes, duckdb::idx_t location) {
    assert(nr_bytes < std::numeric_limits<size_t>::max());
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    auto n = duckdb_web_fs_write(file_hdl.file_id, buffer, nr_bytes, location);
    file_hdl.position_ = location + n;
}
/// Read nr_bytes from the specified file into the buffer, moving the file pointer forward by nr_bytes. Returns the
/// amount of bytes read.
int64_t WebFileSystem::Read(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes) {
    assert(nr_bytes < std::numeric_limits<size_t>::max());
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    auto n = duckdb_web_fs_read(file_hdl.file_id, buffer, nr_bytes, file_hdl.position_);
    file_hdl.position_ += n;
    return n;
}
/// Write nr_bytes from the buffer into the file, moving the file pointer forward by nr_bytes.
int64_t WebFileSystem::Write(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes) {
    assert(nr_bytes < std::numeric_limits<size_t>::max());
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    auto n = duckdb_web_fs_write(file_hdl.file_id, buffer, nr_bytes, file_hdl.position_);
    file_hdl.position_ += n;
    return n;
}
/// Returns the file size of a file handle, returns -1 on error
int64_t WebFileSystem::GetFileSize(duckdb::FileHandle &handle) {
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    return duckdb_web_fs_file_get_size(file_hdl.file_id);
}
/// Returns the file last modified time of a file handle, returns timespec with zero on all attributes on error
time_t WebFileSystem::GetLastModifiedTime(duckdb::FileHandle &handle) {
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    return duckdb_web_fs_file_get_last_modified_time(file_hdl.file_id);
}
/// Truncate a file to a maximum size of new_size, new_size should be smaller than or equal to the current size of
/// the file
void WebFileSystem::Truncate(duckdb::FileHandle &handle, int64_t new_size) {
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    duckdb_web_fs_file_truncate(file_hdl.file_id, new_size);
}
/// Check if a directory exists
bool WebFileSystem::DirectoryExists(const std::string &directory) {
    return duckdb_web_fs_directory_exists(directory.c_str(), directory.size());
}
/// Create a directory if it does not exist
void WebFileSystem::CreateDirectory(const std::string &directory) {
    duckdb_web_fs_directory_create(directory.c_str(), directory.size());
}
/// Recursively remove a directory and all files in it
void WebFileSystem::RemoveDirectory(const std::string &directory) {
    return duckdb_web_fs_directory_remove(directory.c_str(), directory.size());
}
/// List files in a directory, invoking the callback method for each one with (filename, is_dir)
bool WebFileSystem::ListFiles(const std::string &directory, const std::function<void(std::string, bool)> &callback) {
    list_files_callback = &callback;
    bool result = duckdb_web_fs_directory_list_files(directory.c_str(), directory.size());
    list_files_callback = {};
    return result;
}
/// Move a file from source path to the target, StorageManager relies on this being an atomic action for ACID
/// properties
void WebFileSystem::MoveFile(const std::string &source, const std::string &target) {
    duckdb_web_fs_file_move(source.c_str(), source.size(), target.c_str(), target.size());
}
/// Check if a file exists
bool WebFileSystem::FileExists(const std::string &filename) {
    return duckdb_web_fs_file_exists(filename.c_str(), filename.size());
}
/// Remove a file from disk
void WebFileSystem::RemoveFile(const std::string &filename) {
    throw std::logic_error("WebFileSystem::RemoveFile not implemented");
}

/// Sync a file handle to disk
void WebFileSystem::FileSync(duckdb::FileHandle &handle) {
    // Noop, runtime writes directly
}

/// Sets the working directory
void WebFileSystem::SetWorkingDirectory(const std::string &path) {}
/// Gets the working directory
std::string WebFileSystem::GetWorkingDirectory() { return "/"; }
/// Gets the users home directory
std::string WebFileSystem::GetHomeDirectory() { return "/"; }

/// Runs a glob on the file system, returning a list of matching files
std::vector<std::string> WebFileSystem::Glob(const std::string &path) {
    std::vector<std::string> results;
    glob_results = &results;
    duckdb_web_fs_glob(path.c_str(), path.size());
    glob_results = {};
    return results;
}

/// Set the file pointer of a file handle to a specified location. Reads and writes will happen from this location
void WebFileSystem::Seek(FileHandle &handle, idx_t location) {
    static_cast<WebFileHandle &>(handle).position_ = location;
}
/// Reset a file to the beginning (equivalent to Seek(handle, 0) for simple files)
void WebFileSystem::Reset(FileHandle &handle) { static_cast<WebFileHandle &>(handle).position_ = 0; }
/// Get the current position in the file
idx_t WebFileSystem::SeekPosition(FileHandle &handle) { return static_cast<WebFileHandle &>(handle).position_; }
/// Whether or not we can seek into the file
bool WebFileSystem::CanSeek() { return true; }
// Whether or not the FS handles plain files on disk. This is relevant for certain optimizations, as random reads
// in a file on-disk are much cheaper than e.g. random reads in a file over the network
bool WebFileSystem::OnDiskFile(FileHandle &handle) { return true; }

}  // namespace io
}  // namespace web
}  // namespace duckdb
