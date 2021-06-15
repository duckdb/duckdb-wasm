#include "duckdb/web/io/web_filesystem.h"

#include <iostream>
#include <string>
#include <vector>

#include "duckdb/common/file_system.hpp"
#include "duckdb/web/io/web_filesystem.h"
#include "duckdb/web/wasm_response.h"
#include "rapidjson/document.h"
#include "rapidjson/stringbuffer.h"
#include "rapidjson/writer.h"

static const std::function<void(std::string, bool)> *list_files_callback = {};
static std::vector<std::string> *glob_results = {};

#ifdef EMSCRIPTEN
extern "C" {
extern void duckdb_web_fs_file_open(size_t fileId);
extern void duckdb_web_fs_file_sync(size_t fileId);
extern void duckdb_web_fs_file_close(size_t fileId);
extern time_t duckdb_web_fs_file_get_last_modified_time(size_t fileId);
extern double duckdb_web_fs_file_get_size(size_t fileId);
extern ssize_t duckdb_web_fs_file_read(size_t fileId, void *buffer, ssize_t bytes, double location);
extern ssize_t duckdb_web_fs_file_write(size_t fileId, void *buffer, ssize_t bytes, double location);
extern void duckdb_web_fs_file_truncate(size_t fileId, double newSize);

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
void duckdb_web_fs_file_open(size_t fileId) {}
void duckdb_web_fs_file_sync(size_t fileId) {}
void duckdb_web_fs_file_close(size_t fileId) {}
time_t duckdb_web_fs_file_get_last_modified_time(size_t fileId) { return 0; }
double duckdb_web_fs_file_get_size(size_t fileId) { return 0; }
ssize_t duckdb_web_fs_file_read(size_t fileId, void *buffer, ssize_t bytes, double location) { return 0; }
ssize_t duckdb_web_fs_file_write(size_t fileId, void *buffer, ssize_t bytes, double location) { return 0; }
void duckdb_web_fs_file_truncate(size_t fileId, double newSize) {}

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

WebFileSystem::WebFileBuffer::WebFileBuffer(std::unique_ptr<char[]> data, size_t size)
    : data_(std::move(data)), size_(size), capacity_(size) {}

void WebFileSystem::WebFileBuffer::Resize(size_t n) {
    if (n > capacity_) {
        auto cap = std::max(capacity_ + capacity_ + capacity_ / 4, n);
        auto next = std::unique_ptr<char[]>(new char[cap]);
        ::memcpy(next.get(), data_.get(), size_);
        data_ = std::move(next);
        capacity_ = cap;
    } else if (n < (capacity_ / 2)) {
        auto next = std::unique_ptr<char[]>(new char[n]);
        ::memcpy(next.get(), data_.get(), n);
        data_ = std::move(next);
        capacity_ = n;
    }
    size_ = n;
}

namespace {
/// The current web filesystem
static WebFileSystem *current_webfs = nullptr;
}  // namespace

extern "C" {

/// Lookup file info
void duckdb_web_fs_get_file_info(WASMResponse *packed, size_t file_id) {
    if (!current_webfs) {
        WASMResponseBuffer::GetInstance().Store(*packed, std::string_view{""});
    } else {
        auto info = current_webfs->GetFileInfo(file_id);
        WASMResponseBuffer::GetInstance().Store(*packed, std::move(info));
    }
}

/// Set a file descriptor of an existing file
void duckdb_web_fs_set_file_descriptor(WASMResponse *packed, uint32_t file_id, uint32_t file_descriptor) {
    if (!current_webfs) {
        WASMResponseBuffer::GetInstance().Store(*packed, arrow::Status::Invalid("WebFileSystem not set"));
        return;
    }
    auto status = current_webfs->SetFileDescriptor(file_id, file_descriptor);
    WASMResponseBuffer::GetInstance().Store(*packed, status);
}

/// Register a file at a url
void duckdb_web_fs_register_file_url(WASMResponse *packed, const char *file_name, const char *file_url) {
    if (!current_webfs) {
        WASMResponseBuffer::GetInstance().Store(*packed, arrow::Status::Invalid("WebFileSystem not set"));
        return;
    }
    auto status = current_webfs->RegisterFileURL(file_name, file_url);
    WASMResponseBuffer::GetInstance().Store(*packed, status);
}

/// Register a file buffer
void duckdb_web_fs_register_file_buffer(WASMResponse *packed, const char *file_name, char *data, uint32_t data_length) {
    auto data_ptr = std::unique_ptr<char[]>(data);
    WebFileSystem::WebFileBuffer file_buffer{std::move(data_ptr), data_length};
    if (!current_webfs) {
        WASMResponseBuffer::GetInstance().Store(*packed, arrow::Status::Invalid("WebFileSystem not set"));
        return;
    }
    auto status = current_webfs->RegisterFileBuffer(file_name, std::move(file_buffer));
    WASMResponseBuffer::GetInstance().Store(*packed, status);
}

/// Drop a file
void duckdb_web_fs_drop_file(WASMResponse *packed, const char *file_name);
/// Drop all files
void duckdb_web_fs_drop_files(WASMResponse *packed);
/// Copy a file to a path
void duckdb_web_fs_copy_file_to_path(WASMResponse *packed, const char *file_name, const char *file_path);
/// Copy a file to a buffer
void duckdb_web_fs_copy_file_to_buffer(WASMResponse *packed, const char *file_name);
}

/// Close a file handle
void WebFileSystem::WebFileHandle::Close() {
    if (!file_) return;
    auto &file = *file_;
    file_ = nullptr;
    std::unique_lock<std::shared_mutex> file_guard{file.file_mutex_};
    if (--file.handle_count_ > 0) return;
    std::unique_lock<std::mutex> fs_guard{fs_.fs_mutex_};
    duckdb_web_fs_file_close(file.file_id_);
    fs_.files_by_name_.erase(file.file_name_);
    fs_.files_by_id_.erase(file.file_id_);
}

/// Get the info
std::string WebFileSystem::WebFile::GetInfo() const {
    // Start the JSON document
    rapidjson::Document doc;
    doc.SetObject();
    auto &allocator = doc.GetAllocator();
    rapidjson::Value data_fd{rapidjson::kNullType};
    rapidjson::Value data_url{rapidjson::kNullType};
    if (data_fd_) data_fd = rapidjson::Value{*data_fd_};
    if (data_url_) data_url = rapidjson::Value{data_url_->c_str(), static_cast<rapidjson::SizeType>(data_url_->size())};

    // Add the JSON document members
    doc.AddMember("file_id", rapidjson::Value{file_id_}, allocator);
    doc.AddMember("file_name",
                  rapidjson::Value{file_name_.c_str(), static_cast<rapidjson::SizeType>(file_name_.size())}, allocator);
    doc.AddMember("data_fd", data_fd, allocator);
    doc.AddMember("data_url", data_url, allocator);

    // Write to string
    rapidjson::StringBuffer strbuf;
    rapidjson::Writer<rapidjson::StringBuffer> writer{strbuf};
    doc.Accept(writer);
    return strbuf.GetString();
}

/// Constructor
WebFileSystem::WebFileSystem() {
    assert(current_webfs == nullptr && "Can construct only one web filesystem at a time");
    current_webfs = this;
}

/// Destructor
WebFileSystem::~WebFileSystem() { current_webfs = nullptr; }

/// Register a file URL
arrow::Status WebFileSystem::RegisterFileURL(std::string_view file_name, std::string_view file_url) {
    std::unique_lock<std::mutex> fs_guard{fs_mutex_};
    auto iter = files_by_name_.find(file_name);
    if (iter != files_by_name_.end()) return arrow::Status::Invalid("File already registered: ", file_name);
    auto file_id = AllocateFileID();
    auto file = WebFile::URL(file_id, file_name, file_url);
    auto file_ptr = file.get();
    files_by_id_.insert({file_id, std::move(file)});
    files_by_name_.insert({std::string_view{file_ptr->file_name_}, file_ptr});
    return arrow::Status::OK();
}

/// Register a file buffer
arrow::Status WebFileSystem::RegisterFileBuffer(std::string_view file_name, WebFileBuffer file_buffer) {
    std::unique_lock<std::mutex> fs_guard{fs_mutex_};
    auto iter = files_by_name_.find(file_name);
    if (iter != files_by_name_.end()) return arrow::Status::Invalid("File already registered: ", file_name);
    auto file_id = AllocateFileID();
    auto file = WebFile::Buffer(file_id, file_name, std::move(file_buffer));
    auto file_ptr = file.get();
    files_by_id_.insert({file_id, std::move(file)});
    files_by_name_.insert({std::string_view{file_ptr->file_name_}, file_ptr});
    return arrow::Status::OK();
}

/// Set a file descriptor
arrow::Status WebFileSystem::SetFileDescriptor(uint32_t file_id, uint32_t file_descriptor) {
    std::unique_lock<std::mutex> fs_guard{fs_mutex_};
    auto iter = files_by_id_.find(file_id);
    if (iter == files_by_id_.end()) return arrow::Status::Invalid("Invalid file id", file_id);
    iter->second->data_fd_ = file_descriptor;
    return arrow::Status::OK();
}

/// Get a file info as JSON string
arrow::Result<std::string> WebFileSystem::GetFileInfo(uint32_t file_id) {
    std::unique_lock<std::mutex> fs_guard{fs_mutex_};
    auto iter = files_by_id_.find(file_id);
    if (iter == files_by_id_.end()) return arrow::Status::Invalid("Invalid file id: ", file_id);
    auto &file = *iter->second;
    return file.GetInfo();
}

/// Open a file
std::unique_ptr<duckdb::FileHandle> WebFileSystem::OpenFile(const string &path, uint8_t flags, FileLockType lock,
                                                            FileCompressionType compression) {
    std::unique_lock<std::mutex> fs_guard{fs_mutex_};
    auto iter = files_by_name_.find(path);

    // Don't know that file yet?
    WebFile *file_ptr = nullptr;
    if (iter == files_by_name_.end()) {
        // Create file
        auto file = std::make_unique<WebFile>(AllocateFileID(), path);
        auto file_id = file->file_id_;
        file_ptr = file.get();
        std::string_view file_name{file->file_name_};
        files_by_id_.insert({file_id, std::move(file)});
        files_by_name_.insert({file_name, file.get()});

        // Try to open the file
        try {
            duckdb_web_fs_file_open(file_id);
        } catch (...) {
            files_by_id_.erase(file_id);
            files_by_name_.erase(file_name);
            throw;
        }
    } else {
        file_ptr = iter->second;
    }

    // Open the file
    return std::make_unique<WebFileHandle>(*this, std::string(path), *file_ptr);
}

void WebFileSystem::Read(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes, duckdb::idx_t location) {
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    file_hdl.position_ = location;
    Read(handle, buffer, nr_bytes);
}

int64_t WebFileSystem::Read(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes) {
    assert(nr_bytes < std::numeric_limits<size_t>::max());
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    assert(file_hdl.file_);
    auto &file = *file_hdl.file_;
    std::shared_lock<std::shared_mutex> file_guard{file.file_mutex_};
    auto data_size = file.data_size_.value_or(0);
    if (file.data_buffer_) {
        auto n = nr_bytes;
        if (file.data_size_) {
            n = std::min<size_t>(nr_bytes, *file.data_size_ - std::min(file_hdl.position_, *file.data_size_));
        }
        ::memcpy(buffer, file.data_buffer_->Get().data() + file_hdl.position_, n);
        file_hdl.position_ += n;
        return n;
    } else {
        auto n = duckdb_web_fs_file_read(file.file_id_, buffer, nr_bytes, file_hdl.position_);
        file_hdl.position_ += n;
        return n;
    }
}

void WebFileSystem::Write(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes, duckdb::idx_t location) {
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    file_hdl.position_ = location;
    Read(handle, buffer, nr_bytes);
}

int64_t WebFileSystem::Write(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes) {
    assert(nr_bytes < std::numeric_limits<size_t>::max());
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    assert(file_hdl.file_);
    auto &file = *file_hdl.file_;
    std::unique_lock<std::shared_mutex> file_guard{file.file_mutex_};
    if (file.data_buffer_) {
        auto end = file_hdl.position_ + nr_bytes;
        file.data_buffer_->Resize(end);
        ::memcpy(file.data_buffer_->Get().data() + file_hdl.position_, buffer, nr_bytes);
        file_hdl.position_ = end;
        return nr_bytes;
    } else {
        auto n = duckdb_web_fs_file_write(file.file_id_, buffer, nr_bytes, file_hdl.position_);
        file_hdl.position_ = file_hdl.position_ + n;
        return n;
    }
}

/// Returns the file size of a file handle, returns -1 on error
int64_t WebFileSystem::GetFileSize(duckdb::FileHandle &handle) {
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    assert(file_hdl.file_);
    auto &file = *file_hdl.file_;
    std::shared_lock<std::shared_mutex> file_guard{file.file_mutex_};
    return duckdb_web_fs_file_get_size(file.file_id_);
}
/// Returns the file last modified time of a file handle, returns timespec with zero on all attributes on error
time_t WebFileSystem::GetLastModifiedTime(duckdb::FileHandle &handle) {
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    assert(file_hdl.file_);
    auto &file = *file_hdl.file_;
    std::shared_lock<std::shared_mutex> file_guard{file.file_mutex_};
    return duckdb_web_fs_file_get_last_modified_time(file.file_id_);
}
/// Truncate a file to a maximum size of new_size, new_size should be smaller than or equal to the current size of
/// the file
void WebFileSystem::Truncate(duckdb::FileHandle &handle, int64_t new_size) {
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    assert(file_hdl.file_);
    auto &file = *file_hdl.file_;
    std::shared_lock<std::shared_mutex> file_guard{file_hdl.file_->file_mutex_};
    duckdb_web_fs_file_truncate(file.file_id_, new_size);
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
