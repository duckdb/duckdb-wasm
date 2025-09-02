#include "duckdb/web/io/memory_filesystem.h"

#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

#include "duckdb/common/file_system.hpp"
#include "duckdb/web/io/web_filesystem.h"

namespace duckdb {
namespace web {
namespace io {

/// Constructor
MemoryFileSystem::FileBuffer::FileBuffer(size_t id, std::string path, std::vector<char> buffer)
    : file_id(id), file_path(std::move(path)), buffer(std::move(buffer)), handles() {}
/// Constructor
MemoryFileSystem::FileHandle::FileHandle(MemoryFileSystem &file_system, FileBuffer &buffer, size_t position)
    : duckdb::FileHandle(file_system, buffer.file_path,
                         FileFlags::FILE_FLAGS_WRITE | FileFlags::FILE_FLAGS_FILE_CREATE),
      file_system_(file_system),
      buffer_(buffer),
      position_(position) {}

/// Constructor
void MemoryFileSystem::FileHandle::Close() {
    if (buffer_.handles.erase(this) == 0) return;
    if (buffer_.handles.empty()) {
        auto file_id = buffer_.file_id;
        auto file_path = std::move(buffer_.file_path);
        file_system_.file_paths.erase(file_path);
        file_system_.files.erase(file_id);
    }
}

/// Register a file buffer
arrow::Status MemoryFileSystem::RegisterFileBuffer(std::string name, std::vector<char> buffer) {
    if (file_paths.count(name)) return arrow::Status::Invalid("file already registered");
    auto file_buffer = std::make_unique<FileBuffer>(next_file_id++, std::move(name), std::move(buffer));
    auto file_buffer_ptr = file_buffer.get();
    auto file_id = file_buffer->file_id;
    std::string_view file_path = file_buffer->file_path;
    files.insert({file_id, std::move(file_buffer)});
    file_paths.insert({file_path, file_buffer_ptr});
    return arrow::Status::OK();
}

/// Open a file
duckdb::unique_ptr<duckdb::FileHandle> MemoryFileSystem::OpenFile(const string &path, duckdb::FileOpenFlags flags,
                                                                  optional_ptr<FileOpener> opener) {
    // Resolve the file buffer
    auto file_iter = file_paths.find(path);
    if (file_iter == file_paths.end()) throw new std::logic_error{"File is not registered"};
    auto &file_buffer = *file_iter->second;

    // Can the buffer be locked exclusively?
    if (flags.Lock() == duckdb::FileLockType::WRITE_LOCK && !file_buffer.handles.empty()) {
        throw new std::logic_error{"Cannot lock file exclusively"};
    }

    // Register the handle and return it
    auto handle = std::make_unique<MemoryFileSystem::FileHandle>(*this, file_buffer, 0);
    file_buffer.handles.insert(handle.get());
    return handle;
}

/// Read exactly nr_bytes from the specified location in the file. Fails if nr_bytes could not be read.
void MemoryFileSystem::Read(duckdb::FileHandle &raw_handle, void *buffer, int64_t nr_bytes, duckdb::idx_t location) {
    auto &handle = reinterpret_cast<FileHandle &>(raw_handle);
    auto safe_loc = std::min<size_t>(handle.buffer_.buffer.size(), location);
    auto available = handle.buffer_.buffer.size() - safe_loc;
    if (available < nr_bytes) {
        std::stringstream ss;
        ss << "insufficient bytes available: loc=" << location << " size=" << handle.buffer_.buffer.size()
           << " avail=" << available << " req=" << nr_bytes;
        throw std::invalid_argument(ss.str());
    }
    std::memcpy(buffer, handle.buffer_.buffer.data() + safe_loc, nr_bytes);
    handle.position_ = safe_loc + nr_bytes;
}
/// Write exactly nr_bytes to the specified location in the file. Fails if nr_bytes could not be read.
void MemoryFileSystem::Write(duckdb::FileHandle &raw_handle, void *buffer, int64_t nr_bytes, duckdb::idx_t location) {
    auto &handle = reinterpret_cast<FileHandle &>(raw_handle);
    auto safe_loc = std::min<size_t>(handle.buffer_.buffer.size(), location);
    auto available = handle.buffer_.buffer.size() - safe_loc;
    if (available < nr_bytes) throw std::invalid_argument("insufficient bytes available");
    std::memcpy(handle.buffer_.buffer.data() + safe_loc, buffer, nr_bytes);
    handle.position_ = safe_loc + nr_bytes;
}

/// Read nr_bytes from the specified file into the buffer, moving the file pointer forward by nr_bytes. Returns the
/// amount of bytes read.
int64_t MemoryFileSystem::Read(duckdb::FileHandle &raw_handle, void *buffer, int64_t nr_bytes) {
    auto &handle = reinterpret_cast<FileHandle &>(raw_handle);
    auto available = handle.buffer_.buffer.size() - handle.position_;
    auto n = std::min<size_t>(nr_bytes, available);
    std::memcpy(buffer, handle.buffer_.buffer.data() + handle.position_, n);
    handle.position_ += n;
    return n;
}

/// Write nr_bytes from the buffer into the file, moving the file pointer forward by nr_bytes.
int64_t MemoryFileSystem::Write(duckdb::FileHandle &raw_handle, void *buffer, int64_t nr_bytes) {
    auto &handle = reinterpret_cast<FileHandle &>(raw_handle);
    auto available = handle.buffer_.buffer.size() - handle.position_;
    auto n = std::min<size_t>(nr_bytes, available);
    std::memcpy(handle.buffer_.buffer.data() + handle.position_, buffer, n);
    handle.position_ += nr_bytes;
    return n;
}

/// Returns the file size of a file handle, returns -1 on error
int64_t MemoryFileSystem::GetFileSize(duckdb::FileHandle &raw_handle) {
    return reinterpret_cast<FileHandle &>(raw_handle).buffer_.buffer.size();
}

/// Returns the file last modified time of a file handle, returns timespec with zero on all attributes on error
timestamp_t MemoryFileSystem::GetLastModifiedTime(duckdb::FileHandle &handle) { return timestamp_t(0); }

/// Truncate a file to a maximum size of new_size, new_size should be smaller than or equal to the current size of
/// the file
void MemoryFileSystem::Truncate(duckdb::FileHandle &raw_handle, int64_t new_size) {
    auto &handle = reinterpret_cast<FileHandle &>(raw_handle);
    handle.buffer_.buffer.resize(new_size);
}

/// Check if a directory exists
bool MemoryFileSystem::DirectoryExists(const std::string &directory, optional_ptr<FileOpener> opener) { return true; }
/// Create a directory if it does not exist
void MemoryFileSystem::CreateDirectory(const std::string &directory, optional_ptr<FileOpener> opener) {}
/// Recursively remove a directory and all files in it
void MemoryFileSystem::RemoveDirectory(const std::string &directory, optional_ptr<FileOpener> opener) {}

/// List files in a directory, invoking the callback method for each one with (filename, is_dir)
bool MemoryFileSystem::ListFiles(const std::string &directory,
                                 const std::function<void(const std::string &, bool)> &callback, FileOpener *opener) {
    bool any = false;
    for (auto &[path, buffer] : file_paths) {
        if (std::equal(directory.begin(), directory.begin() + std::min(directory.size(), path.size()), path.begin())) {
            callback(buffer->file_path, false);
            any = true;
        }
    }
    return any;
}

/// Move a file from source path to the target, StorageManager relies on this being an atomic action for ACID
/// properties
void MemoryFileSystem::MoveFile(const std::string &source, const std::string &target, optional_ptr<FileOpener> opener) {
    auto file_paths_iter = file_paths.find(source);
    if (file_paths_iter == file_paths.end()) throw new std::logic_error{"File does not exist"};
    auto file_id = file_paths_iter->second->file_id;
    file_paths.erase(file_paths_iter);
    auto file_iter = files.find(file_id);
    assert(file_iter != files.end());
    auto file_buffer = std::move(file_iter->second);
    auto file_buffer_ptr = file_buffer.get();
    files.erase(file_iter);
    file_buffer->file_path = target;
    file_paths.insert({file_buffer->file_path, file_buffer.get()});
    files.insert({file_id, std::move(file_buffer)});
}

/// Check if a file exists
bool MemoryFileSystem::FileExists(const std::string &filename, optional_ptr<FileOpener> opener) {
    auto file_paths_iter = file_paths.find(filename);
    return file_paths_iter != file_paths.end();
}

/// Remove a file from disk
void MemoryFileSystem::RemoveFile(const std::string &filename, optional_ptr<FileOpener> opener) {
    auto file_paths_iter = file_paths.find(filename);
    if (file_paths_iter == file_paths.end()) throw new std::logic_error{"File does not exist"};
    if (!file_paths_iter->second->handles.empty()) throw new std::logic_error{"Cannot remove a file with open handles"};
    auto file_id = file_paths_iter->second->file_id;
    file_paths.erase(file_paths_iter);
    files.erase(file_id);
}

/// Sync a file handle to disk
void MemoryFileSystem::FileSync(duckdb::FileHandle &handle) {}

/// Runs a glob on the file system, returning a list of matching files
vector<OpenFileInfo> MemoryFileSystem::Glob(const std::string &path, FileOpener *opener) {
    // For now, just do exact matches
    auto file_paths_iter = file_paths.find(path);
    if (file_paths_iter == file_paths.end()) return {};
    return {path};
}

/// Set the file pointer of a file handle to a specified location. Reads and writes will happen from this location
void MemoryFileSystem::Seek(duckdb::FileHandle &handle, idx_t location) {
    static_cast<FileHandle &>(handle).position_ = location;
}
/// Reset a file to the beginning (equivalent to Seek(handle, 0) for simple files)
void MemoryFileSystem::Reset(duckdb::FileHandle &handle) { static_cast<FileHandle &>(handle).position_ = 0; }
/// Get the current position in the file
idx_t MemoryFileSystem::SeekPosition(duckdb::FileHandle &handle) { return static_cast<FileHandle &>(handle).position_; }
/// Whether or not we can seek into the file
bool MemoryFileSystem::CanSeek() { return true; }
// Whether or not the FS handles plain files on disk. This is relevant for certain optimizations, as random reads
// in a file on-disk are much cheaper than e.g. random reads in a file over the network
bool MemoryFileSystem::OnDiskFile(duckdb::FileHandle &handle) { return true; }

/// Return the name of the filesytem. Used for forming diagnosis messages.
std::string MemoryFileSystem::GetName() const { return "MemoryFileSystem"; }

}  // namespace io
}  // namespace web
}  // namespace duckdb
