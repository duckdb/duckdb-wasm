#include "duckdb/web/io/buffered_filesystem.h"

#include <cstring>
#include <iostream>
#include <string>
#include <vector>

#include "duckdb/common/file_system.hpp"
#include "duckdb/web/io/buffered_filesystem.h"
#include "duckdb/web/io/file_page_buffer.h"
#include "duckdb/web/io/web_filesystem.h"
#include "duckdb/web/utils/parallel.h"

static const std::function<void(std::string, bool)> *list_files_callback = {};
static std::vector<std::string> *glob_results = {};

namespace duckdb {
namespace web {
namespace io {

std::string_view BufferedFileSystem::PatchFilename(std::string_view file) {
    std::string_view suffix{".tmp"};
    if (suffix.size() > file.size()) return file;
    if (std::equal(suffix.rbegin(), suffix.rend(), file.rbegin())) {
        return file.substr(0, file.size() - suffix.size());
    }
    return file;
}

std::string BufferedFileSystem::PatchFilenameOwned(const std::string &file) {
    std::string_view suffix{".tmp"};
    if (suffix.size() > file.size()) return file;
    if (std::equal(suffix.rbegin(), suffix.rend(), file.rbegin())) {
        return file.substr(0, file.size() - suffix.size());
    }
    return file;
}

/// Constructor
void BufferedFileHandle::Close() { file_ref_->Release(); }

/// Constructor
BufferedFileHandle::BufferedFileHandle(duckdb::FileSystem &file_system,
                                       std::shared_ptr<FilePageBuffer::FileRef> file_buffers)
    : duckdb::FileHandle(file_system, std::string{file_buffers->GetPath()}),
      file_ref_(std::move(file_buffers)),
      file_position_(0) {}

/// Constructor
BufferedFileHandle::~BufferedFileHandle() { Close(); }

BufferedFileSystem::BufferedFileSystem(std::shared_ptr<FilePageBuffer> buffer_manager)
    : file_page_buffer_(std::move(buffer_manager)),
      filesystem_(*file_page_buffer_->GetFileSystem()),
      directory_mutex_(),
      file_configs_() {}

/// Pass through a file
void BufferedFileSystem::RegisterFile(std::string_view file, FileConfig config) {
    file = PatchFilename(file);
    std::unique_lock<LightMutex> fs_guard{directory_mutex_};
    file_configs_.insert({std::string{file}, config});
}

/// Try to drop a file
bool BufferedFileSystem::TryDropFile(std::string_view file) {
    file = PatchFilename(file);
    std::unique_lock<LightMutex> fs_guard{directory_mutex_};
    if (file_page_buffer_->BuffersFile(file)) {
        return file_page_buffer_->TryDropFile(file);
    }
    file_configs_.erase({std::string{file}});
    return true;
}

/// Drop all files
void BufferedFileSystem::DropFiles() {
    std::unique_lock<LightMutex> fs_guard{directory_mutex_};
    file_configs_.clear();
    file_page_buffer_->DropDanglingFiles();
}

/// Open a file
duckdb::unique_ptr<duckdb::FileHandle> BufferedFileSystem::OpenFile(const string &raw_path, duckdb::FileOpenFlags flags,
                                                                    optional_ptr<FileOpener> opener) {
    auto path = PatchFilenameOwned(raw_path);
    std::unique_lock<LightMutex> fs_guard{directory_mutex_};

    // Bypass the buffering?
    auto iter = file_configs_.find(path);
    if (flags.DirectIO() || (iter != file_configs_.end() && iter->second.force_direct_io)) {
        return filesystem_.OpenFile(path, flags, opener);
    }

    // Open in page buffer
    auto file = file_page_buffer_->OpenFile(std::string_view{path}, flags, opener);  // XXX compression?
    if (!file) {
        return nullptr;
    }

    return std::make_unique<BufferedFileHandle>(*this, std::move(file));
}

/// Read exactly nr_bytes from the specified location in the file. Fails if nr_bytes could not be read.
void BufferedFileSystem::Read(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes, duckdb::idx_t location) {
    // Direct I/O?
    if (&handle.file_system != this) {
        handle.Read(buffer, nr_bytes, location);
        return;
    }

    // Read page-wise
    auto &file_hdl = static_cast<BufferedFileHandle &>(handle);
    auto &file = file_hdl.GetFile();
    auto reader = static_cast<char *>(buffer);
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
        throw std::logic_error("tried to read past the end");
    }
}
/// Write exactly nr_bytes to the specified location in the file.
void BufferedFileSystem::Write(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes, duckdb::idx_t location) {
    // Direct I/O?
    if (&handle.file_system != this) {
        handle.Write(buffer, nr_bytes, location);
        return;
    }

    // Write page-wise
    auto &file_hdl = static_cast<BufferedFileHandle &>(handle);
    auto &file = file_hdl.GetFile();
    auto writer = static_cast<char *>(buffer);
    auto file_size = file->GetSize();
    while (nr_bytes > 0) {
        auto n = file->Write(writer, nr_bytes, location);
        writer += n;
        location += n;
        nr_bytes -= n;
    }
    file_hdl.file_position_ = location;
}
/// Read nr_bytes from the specified file into the buffer, moving the file pointer forward by nr_bytes. Returns the
/// amount of bytes read.
int64_t BufferedFileSystem::Read(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes) {
    // Direct I/O?
    if (&handle.file_system != this) {
        return handle.Read(buffer, nr_bytes);
    }

    // Read manually at position
    auto &file_hdl = static_cast<BufferedFileHandle &>(handle);
    auto &file = file_hdl.GetFile();
    auto n = file->Read(buffer, nr_bytes, file_hdl.file_position_);
    file_hdl.file_position_ += n;
    return n;
}
/// Write nr_bytes from the buffer into the file, moving the file pointer forward by nr_bytes.
int64_t BufferedFileSystem::Write(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes) {
    // Direct I/O?
    if (&handle.file_system != this) {
        return handle.Write(buffer, nr_bytes);
    }

    // Write manually at position
    auto &file_hdl = static_cast<BufferedFileHandle &>(handle);
    auto &file = file_hdl.GetFile();
    auto n = file->Write(buffer, nr_bytes, file_hdl.file_position_);
    file_hdl.file_position_ += n;
    return n;
}

/// Sync a file handle to disk
void BufferedFileSystem::FileSync(duckdb::FileHandle &handle) {
    // Direct I/O?
    if (&handle.file_system != this) {
        return handle.Sync();
    }

    // Flush the files in the page buffer
    auto &file_hdl = static_cast<BufferedFileHandle &>(handle);
    auto &file = file_hdl.GetFile();
    file->Flush();
}

/// Returns the file size of a file handle, returns -1 on error
int64_t BufferedFileSystem::GetFileSize(duckdb::FileHandle &handle) {
    // Direct I/O?
    if (&handle.file_system != this) {
        return handle.GetFileSize();
    }

    // Get the file size
    auto &file_hdl = static_cast<BufferedFileHandle &>(handle);
    auto &file = file_hdl.GetFile();
    return file->GetSize();
}

/// Returns the file last modified time of a file handle, returns timespec with zero on all attributes on error
time_t BufferedFileSystem::GetLastModifiedTime(duckdb::FileHandle &handle) {
    // Direct I/O?
    if (&handle.file_system != this) {
        return filesystem_.GetLastModifiedTime(handle);
    }
    auto &buffered_hdl = static_cast<BufferedFileHandle &>(handle);
    return filesystem_.GetLastModifiedTime(buffered_hdl.GetFileHandle());
}
/// Truncate a file to a maximum size of new_size, new_size should be smaller than or equal to the current size of
/// the file
void BufferedFileSystem::Truncate(duckdb::FileHandle &handle, int64_t new_size) {
    // Direct I/O?
    if (&handle.file_system != this) {
        return filesystem_.Truncate(handle, new_size);
    }
    auto &buffered_hdl = static_cast<BufferedFileHandle &>(handle);
    return buffered_hdl.GetFile()->Truncate(new_size);
}
/// Recursively remove a directory and all files in it
void BufferedFileSystem::RemoveDirectory(const std::string &directory, optional_ptr<FileOpener> opener) {
    return filesystem_.RemoveDirectory(directory, opener);
}

/// Move a file from source path to the target, StorageManager relies on this being an atomic action for ACID
/// properties
void BufferedFileSystem::MoveFile(const std::string &raw_source, const std::string &raw_target,
                                  optional_ptr<FileOpener> opener) {
    auto source = PatchFilenameOwned(raw_source);
    auto target = PatchFilenameOwned(raw_target);
    // XXX Invalidate buffer manager!
    return filesystem_.MoveFile(source, target, opener);
}
/// Remove a file from disk
void BufferedFileSystem::RemoveFile(const std::string &raw_filename, optional_ptr<FileOpener> opener) {
    auto filename = PatchFilenameOwned(raw_filename);
    // XXX Invalidate buffer manager!
    return filesystem_.RemoveFile(filename);
}

/// Register subsystem
void BufferedFileSystem::RegisterSubSystem(unique_ptr<FileSystem> sub_fs) { (void)sub_fs; }
/// Register subsystem
void BufferedFileSystem::RegisterSubSystem(FileCompressionType compression_type, unique_ptr<FileSystem> sub_fs) {
    (void)compression_type;
    (void)sub_fs;
}

/// Set the file pointer of a file handle to a specified location. Reads and writes will happen from this location
void BufferedFileSystem::Seek(duckdb::FileHandle &handle, idx_t location) {
    // Direct I/O?
    if (&handle.file_system != this) {
        return handle.Seek(location);
    }
    // Seek in file
    auto &file_hdl = static_cast<BufferedFileHandle &>(handle);
    auto &file = file_hdl.GetFile();
    file_hdl.file_position_ = location;
}
/// Reset a file to the beginning (equivalent to Seek(handle, 0) for simple files)
void BufferedFileSystem::Reset(duckdb::FileHandle &handle) {
    // Direct I/O?
    if (&handle.file_system != this) {
        return handle.Reset();
    }
    // Reset file
    auto &file_hdl = static_cast<BufferedFileHandle &>(handle);
    auto &file = file_hdl.GetFile();
    file_hdl.file_position_ = 0;
}
/// Get the current position within the file
idx_t BufferedFileSystem::SeekPosition(duckdb::FileHandle &handle) {
    // Direct I/O?
    if (&handle.file_system != this) {
        return handle.SeekPosition();
    }
    // Get position
    auto &file_hdl = static_cast<BufferedFileHandle &>(handle);
    auto &file = file_hdl.GetFile();
    return file_hdl.file_position_;
}
/// Whether or not we can seek into the file
bool BufferedFileSystem::CanSeek() { return true; }
/// Whether or not the FS handles plain files on disk. This is relevant for certain optimizations, as random reads
/// in a file on-disk are much cheaper than e.g. random reads in a file over the network
bool BufferedFileSystem::OnDiskFile(duckdb::FileHandle &handle) {
    // Direct I/O?
    if (&handle.file_system != this) {
        return filesystem_.OnDiskFile(handle);
    }
    return filesystem_.OnDiskFile(static_cast<BufferedFileHandle &>(handle).GetFileHandle());
}

/// Return the name of the filesytem. Used for forming diagnosis messages.
std::string BufferedFileSystem::GetName() const { return "BufferedFileSystem"; }

}  // namespace io
}  // namespace web
}  // namespace duckdb
