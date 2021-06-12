#include "duckdb/web/io/buffered_filesystem.h"

#include <cstring>
#include <iostream>
#include <string>
#include <vector>

#include "duckdb/common/file_system.hpp"
#include "duckdb/web/io/buffered_filesystem.h"
#include "duckdb/web/io/filesystem_buffer.h"
#include "duckdb/web/io/web_filesystem.h"

static const std::function<void(std::string, bool)> *list_files_callback = {};
static std::vector<std::string> *glob_results = {};

namespace duckdb {
namespace web {
namespace io {

/// Constructor
void BufferedFileHandle::Close() { file_ref_->Release(); }

/// Constructor
BufferedFileHandle::BufferedFileHandle(duckdb::FileSystem &file_system,
                                       std::shared_ptr<FileSystemBuffer::FileRef> file_buffers)
    : duckdb::FileHandle(file_system, std::string{file_buffers->GetPath()}),
      file_ref_(std::move(file_buffers)),
      file_position_(0) {}

/// Constructor
BufferedFileHandle::~BufferedFileHandle() { Close(); }

BufferedFileSystem::BufferedFileSystem(std::shared_ptr<FileSystemBuffer> buffer_manager)
    : filesystem_buffer_(std::move(buffer_manager)), filesystem_(*filesystem_buffer_->GetFileSystem()) {}

/// Open a file
std::unique_ptr<duckdb::FileHandle> BufferedFileSystem::OpenFile(const string &path, uint8_t flags, FileLockType lock,
                                                                 FileCompressionType compression) {
    auto file = filesystem_buffer_->OpenFile(std::string_view{path});
    return std::make_unique<BufferedFileHandle>(*this, std::move(file));
}

/// Read exactly nr_bytes from the specified location in the file. Fails if nr_bytes could not be read.
void BufferedFileSystem::Read(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes, duckdb::idx_t location) {
    auto &file_hdl = static_cast<BufferedFileHandle &>(handle);
    auto &file = file_hdl.GetFile();
    auto reader = static_cast<char *>(buffer);

    // Read page-wise
    auto file_size = file->GetSize();
    while (nr_bytes > 0 && location < file_size) {
        auto n = file->Read(reader, nr_bytes, location);
        reader += n;
        location += n;
        nr_bytes -= n;
    }
    file_hdl.file_position_ = location;

    // Requested to read past end?
    if (location >= file_size && nr_bytes > 0) {
        throw std::logic_error("tried to write past the end");
    }
}
/// Write exactly nr_bytes to the specified location in the file. Fails if nr_bytes could not be read.
void BufferedFileSystem::Write(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes, duckdb::idx_t location) {
    auto &file_hdl = static_cast<BufferedFileHandle &>(handle);
    auto &file = file_hdl.GetFile();
    auto writer = static_cast<char *>(buffer);

    // Write page-wise
    auto file_size = file->GetSize();
    while (nr_bytes > 0 && location < file_size) {
        auto n = file->Write(writer, nr_bytes, location);
        writer += n;
        location += n;
        nr_bytes -= n;
    }
    file_hdl.file_position_ = location;

    // Requested to write past end?
    if (location >= file_size && nr_bytes > 0) {
        throw std::logic_error("tried to read past the end");
    }
}
/// Read nr_bytes from the specified file into the buffer, moving the file pointer forward by nr_bytes. Returns the
/// amount of bytes read.
int64_t BufferedFileSystem::Read(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes) {
    auto &file_hdl = static_cast<BufferedFileHandle &>(handle);
    auto &file = file_hdl.GetFile();
    auto n = file->Read(buffer, nr_bytes, file_hdl.file_position_);
    file_hdl.file_position_ += n;
    return n;
}
/// Write nr_bytes from the buffer into the file, moving the file pointer forward by nr_bytes.
int64_t BufferedFileSystem::Write(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes) {
    auto &file_hdl = static_cast<BufferedFileHandle &>(handle);
    auto &file = file_hdl.GetFile();
    auto n = file->Write(buffer, nr_bytes, file_hdl.file_position_);
    file_hdl.file_position_ += n;
    return n;
}

/// Sync a file handle to disk
void BufferedFileSystem::FileSync(duckdb::FileHandle &handle) {
    auto &file_hdl = static_cast<BufferedFileHandle &>(handle);
    auto &file = file_hdl.GetFile();
    file->Flush();
}

/// Returns the file size of a file handle, returns -1 on error
int64_t BufferedFileSystem::GetFileSize(duckdb::FileHandle &handle) {
    auto &buffered_hdl = static_cast<BufferedFileHandle &>(handle);
    return buffered_hdl.GetFile()->GetSize();
}

/// Returns the file last modified time of a file handle, returns timespec with zero on all attributes on error
time_t BufferedFileSystem::GetLastModifiedTime(duckdb::FileHandle &handle) {
    auto &buffered_hdl = static_cast<BufferedFileHandle &>(handle);
    return filesystem_.GetLastModifiedTime(buffered_hdl.GetFileHandle());
}
/// Truncate a file to a maximum size of new_size, new_size should be smaller than or equal to the current size of
/// the file
void BufferedFileSystem::Truncate(duckdb::FileHandle &handle, int64_t new_size) {
    auto &buffered_hdl = static_cast<BufferedFileHandle &>(handle);
    return buffered_hdl.GetFile()->Truncate(new_size);
}
/// Recursively remove a directory and all files in it
void BufferedFileSystem::RemoveDirectory(const std::string &directory) {
    return filesystem_.RemoveDirectory(directory);
}

/// Move a file from source path to the target, StorageManager relies on this being an atomic action for ACID
/// properties
void BufferedFileSystem::MoveFile(const std::string &source, const std::string &target) {
    // XXX Invalidate buffer manager!
    return filesystem_.MoveFile(source, target);
}
/// Remove a file from disk
void BufferedFileSystem::RemoveFile(const std::string &filename) {
    // XXX Invalidate buffer manager!
    return filesystem_.RemoveFile(filename);
}
/// Sets the working directory
void BufferedFileSystem::SetWorkingDirectory(const std::string &path) {
    // XXX Invalidate buffer manager!
    return filesystem_.SetWorkingDirectory(path);
}

/// Set the file pointer of a file handle to a specified location. Reads and writes will happen from this location
void BufferedFileSystem::Seek(duckdb::FileHandle &handle, idx_t location) {
    auto &file_hdl = static_cast<BufferedFileHandle &>(handle);
    file_hdl.file_position_ = location;
    filesystem_.Seek(file_hdl.GetFileHandle(), location);
}
/// Reset a file to the beginning (equivalent to Seek(handle, 0) for simple files)
void BufferedFileSystem::Reset(duckdb::FileHandle &handle) {
    auto &file_hdl = static_cast<BufferedFileHandle &>(handle);
    file_hdl.file_position_ = 0;
    filesystem_.Reset(file_hdl.GetFileHandle());
}
/// Get the current position within the file
idx_t BufferedFileSystem::SeekPosition(duckdb::FileHandle &handle) {
    return static_cast<BufferedFileHandle &>(handle).file_position_;
}
/// Whether or not we can seek into the file
bool BufferedFileSystem::CanSeek() { return true; }
/// Whether or not the FS handles plain files on disk. This is relevant for certain optimizations, as random reads
/// in a file on-disk are much cheaper than e.g. random reads in a file over the network
bool BufferedFileSystem::OnDiskFile(duckdb::FileHandle &handle) {
    return filesystem_.OnDiskFile(static_cast<BufferedFileHandle &>(handle).GetFileHandle());
}

}  // namespace io
}  // namespace web
}  // namespace duckdb
