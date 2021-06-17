#include "duckdb/web/io/web_filesystem.h"

#include <iostream>
#include <mutex>
#include <regex>
#include <shared_mutex>
#include <string>
#include <vector>

#include "arrow/buffer.h"
#include "arrow/status.h"
#include "arrow/type_fwd.h"
#include "duckdb/common/file_system.hpp"
#include "duckdb/web/debug.h"
#include "duckdb/web/io/glob.h"
#include "duckdb/web/io/web_filesystem.h"
#include "duckdb/web/scope_guard.h"
#include "duckdb/web/wasm_response.h"
#include "rapidjson/document.h"
#include "rapidjson/stringbuffer.h"
#include "rapidjson/writer.h"

static const std::function<void(std::string, bool)> *list_files_callback = {};
static std::vector<std::string> *glob_results = {};

#ifdef EMSCRIPTEN
#define RT_FN(FUNC, IMPL) extern "C" FUNC;
#else
#define RT_FN(FUNC, IMPL) FUNC IMPL;
#endif

RT_FN(void duckdb_web_fs_file_open(size_t fileId), {});
RT_FN(void duckdb_web_fs_file_sync(size_t fileId), {});
RT_FN(void duckdb_web_fs_file_close(size_t fileId), {});
RT_FN(void duckdb_web_fs_file_truncate(size_t fileId, double newSize), {});
RT_FN(time_t duckdb_web_fs_file_get_last_modified_time(size_t fileId), { return 0; });
RT_FN(double duckdb_web_fs_file_get_size(size_t fileId), { return 0.0; });
RT_FN(ssize_t duckdb_web_fs_file_read(size_t fileId, void *buffer, ssize_t bytes, double location), { return 0; });
RT_FN(ssize_t duckdb_web_fs_file_write(size_t fileId, void *buffer, ssize_t bytes, double location), { return 0; });
RT_FN(void duckdb_web_fs_directory_remove(const char *path, size_t pathLen), {});
RT_FN(bool duckdb_web_fs_directory_exists(const char *path, size_t pathLen), { return false; });
RT_FN(void duckdb_web_fs_directory_create(const char *path, size_t pathLen), {});
RT_FN(bool duckdb_web_fs_directory_list_files(const char *path, size_t pathLen), { return false; });
RT_FN(void duckdb_web_fs_glob(const char *path, size_t pathLen), {});
RT_FN(void duckdb_web_fs_file_move(const char *from, size_t fromLen, const char *to, size_t toLen), {});
RT_FN(bool duckdb_web_fs_file_exists(const char *path, size_t pathLen), { return false; });
RT_FN(bool duckdb_web_fs_file_remove(const char *path, size_t pathLen), { return false; });

#undef RT_FN

namespace duckdb {
namespace web {
namespace io {

WebFileSystem::DataBuffer::DataBuffer(std::unique_ptr<char[]> data, size_t size)
    : data_(std::move(data)), size_(size), capacity_(size) {}

void WebFileSystem::DataBuffer::Resize(size_t n) {
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
static WebFileSystem *WEBFS = nullptr;
}  // namespace

/// Get the static web filesystem
WebFileSystem *WebFileSystem::Get() { return WEBFS; }
/// Close a file handle
void WebFileSystem::WebFileHandle::Close() {
    DEBUG_TRACE();
    if (!file_) return;
    auto &file = *file_;
    file_ = nullptr;
    std::unique_lock<std::shared_mutex> file_guard{file.file_mutex_, std::defer_lock};
    auto have_file_lock = file_guard.try_lock();
    std::unique_lock<std::mutex> fs_guard{fs_.fs_mutex_};
    if (file.handle_count_ > 1) {
        --file.handle_count_;
        return;
    }
    if (!have_file_lock) return;
    fs_guard.unlock();
    if (file.data_protocol_ != DataProtocol::BUFFER) {
        try {
            duckdb_web_fs_file_close(file.file_id_);
        } catch (...) {
        }
    }
    fs_guard.lock();
    auto file_id = file.file_id_;
    auto file_proto = file.data_protocol_;
    fs_.files_by_name_.erase(file.file_name_);
    auto iter = fs_.files_by_id_.find(file.file_id_);
    auto tmp = std::move(iter->second);
    fs_.files_by_id_.erase(iter);
    fs_guard.unlock();
    file_guard.unlock();
}

static inline bool hasPrefix(std::string_view text, std::string_view prefix) {
    return text.compare(0, prefix.size(), prefix) == 0;
}

static inline WebFileSystem::DataProtocol inferDataProtocol(std::string_view url) {
    std::string_view data_url = url;
    auto proto = WebFileSystem::DataProtocol::BUFFER;
    if (hasPrefix(url, "blob:")) {
        proto = WebFileSystem::DataProtocol::BLOB;
    } else if (hasPrefix(url, "http://") || hasPrefix(url, "https://")) {
        proto = WebFileSystem::DataProtocol::HTTP;
    } else if (hasPrefix(url, "file://")) {
        data_url = std::string_view{url}.substr(7);
        proto = WebFileSystem::DataProtocol::NATIVE;
    } else {
        proto = WebFileSystem::DataProtocol::NATIVE;
    }
    return proto;
}

/// Construct file of URL
std::unique_ptr<WebFileSystem::WebFile> WebFileSystem::WebFile::URL(uint32_t file_id, std::string_view file_name,
                                                                    std::string_view file_url) {
    auto proto = inferDataProtocol(file_url);
    auto file = std::make_unique<WebFileSystem::WebFile>(file_id, file_name, proto);
    file->data_url_ = std::move(file_url);
    return file;
}

/// Construct file of URL
std::unique_ptr<WebFileSystem::WebFile> WebFileSystem::WebFile::Buffer(uint32_t file_id, std::string_view file_name,
                                                                       DataBuffer buffer) {
    auto file = std::make_unique<WebFileSystem::WebFile>(file_id, file_name, DataProtocol::BUFFER);
    file->data_buffer_ = std::move(buffer);
    return file;
}

/// Get the info
std::string WebFileSystem::WebFile::GetInfo() const {
    DEBUG_TRACE();
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
    doc.AddMember("data_protocol", static_cast<double>(data_protocol_), allocator);
    doc.AddMember("data_url", data_url, allocator);
    doc.AddMember("data_native_fd", data_fd, allocator);

    // Write to string
    rapidjson::StringBuffer strbuf;
    rapidjson::Writer<rapidjson::StringBuffer> writer{strbuf};
    doc.Accept(writer);
    return strbuf.GetString();
}

/// Constructor
WebFileSystem::WebFileSystem() {
    assert(WEBFS == nullptr && "Can construct only one web filesystem at a time");
    WEBFS = this;
}

/// Destructor
WebFileSystem::~WebFileSystem() { WEBFS = nullptr; }

/// Register a file URL
arrow::Result<std::unique_ptr<WebFileSystem::WebFileHandle>> WebFileSystem::RegisterFileURL(std::string_view file_name,
                                                                                            std::string_view file_url) {
    DEBUG_TRACE();
    std::unique_lock<std::mutex> fs_guard{fs_mutex_};
    auto iter = files_by_name_.find(file_name);
    if (iter != files_by_name_.end()) return arrow::Status::Invalid("File already registered: ", file_name);
    auto file_id = AllocateFileID();
    auto file = WebFile::URL(file_id, file_name, file_url);
    auto file_ptr = file.get();
    files_by_id_.insert({file_id, std::move(file)});
    files_by_name_.insert({std::string_view{file_ptr->file_name_}, file_ptr});
    return std::make_unique<WebFileHandle>(*this, file_ptr->file_name_, *file_ptr);
}

/// Register a file buffer
arrow::Result<std::unique_ptr<WebFileSystem::WebFileHandle>> WebFileSystem::RegisterFileBuffer(
    std::string_view file_name, DataBuffer file_buffer) {
    DEBUG_TRACE();
    std::unique_lock<std::mutex> fs_guard{fs_mutex_};
    auto iter = files_by_name_.find(file_name);
    if (iter != files_by_name_.end()) return arrow::Status::Invalid("File already registered: ", file_name);
    auto file_id = AllocateFileID();
    auto file = WebFile::Buffer(file_id, file_name, std::move(file_buffer));
    auto file_ptr = file.get();
    files_by_id_.insert({file_id, std::move(file)});
    files_by_name_.insert({std::string_view{file_ptr->file_name_}, file_ptr});
    return std::make_unique<WebFileHandle>(*this, file_ptr->file_name_, *file_ptr);
}

/// Set a file descriptor
arrow::Status WebFileSystem::SetFileDescriptor(uint32_t file_id, uint32_t file_descriptor) {
    DEBUG_TRACE();
    std::unique_lock<std::mutex> fs_guard{fs_mutex_};
    auto iter = files_by_id_.find(file_id);
    if (iter == files_by_id_.end()) return arrow::Status::Invalid("Invalid file id: ", file_id);
    iter->second->data_fd_ = file_descriptor;
    return arrow::Status::OK();
}

/// Get a file info as JSON string
arrow::Result<std::string> WebFileSystem::GetFileInfo(uint32_t file_id) {
    DEBUG_TRACE();
    std::unique_lock<std::mutex> fs_guard{fs_mutex_};
    auto iter = files_by_id_.find(file_id);
    if (iter == files_by_id_.end()) return arrow::Status::Invalid("Invalid file id: ", file_id);
    auto &file = *iter->second;
    return file.GetInfo();
}

/// Open a file
std::unique_ptr<duckdb::FileHandle> WebFileSystem::OpenFile(const string &url, uint8_t flags, FileLockType lock,
                                                            FileCompressionType compression) {
    DEBUG_TRACE();
    std::unique_lock<std::mutex> fs_guard{fs_mutex_};

    // Determine url type
    std::string_view data_url = url;
    DataProtocol data_proto = DataProtocol::BUFFER;
    if (hasPrefix(url, "blob:")) {
        data_proto = DataProtocol::BLOB;
    } else if (hasPrefix(url, "http://") || hasPrefix(url, "https://")) {
        data_proto = DataProtocol::HTTP;
    } else if (hasPrefix(url, "file://")) {
        data_url = std::string_view{url}.substr(7);
        data_proto = DataProtocol::NATIVE;
    } else {
        data_proto = DataProtocol::NATIVE;
    }

    // We know that file already?
    WebFile *file_ptr = nullptr;
    auto iter = files_by_name_.find(data_url);
    if (iter == files_by_name_.end()) {
        // Create file
        auto file = std::make_unique<WebFile>(AllocateFileID(), data_url, data_proto);
        auto file_id = file->file_id_;
        file_ptr = file.get();
        std::string_view file_name{file->file_name_};
        assert(!files_by_id_.count(file_id));
        assert(!files_by_name_.count(data_url));
        std::cout << file_id << " " << files_by_id_.count(file_id) << std::endl;
        files_by_id_.insert({file_id, std::move(file)});
        files_by_name_.insert({file_name, file.get()});
    } else {
        file_ptr = iter->second;
    }
    auto handle = std::make_unique<WebFileHandle>(*this, file_ptr->file_name_, *file_ptr);

    // Lock the file
    fs_guard.unlock();
    std::unique_lock<std::shared_mutex> file_guard{file_ptr->file_mutex_};

    // Try to open the file (if necessary)
    switch (file_ptr->data_protocol_) {
        case DataProtocol::BUFFER:
            break;
        case DataProtocol::NATIVE:
            if (file_ptr->data_fd_.has_value()) break;
        case DataProtocol::BLOB:
        case DataProtocol::HTTP:
            try {
                duckdb_web_fs_file_open(file_ptr->file_id_);
            } catch (...) {
                fs_guard.lock();
                files_by_name_.erase(file_ptr->file_name_);
                auto iter = files_by_id_.find(file_ptr->file_id_);
                auto tmp = std::move(iter->second);
                files_by_id_.erase(iter);
                file_guard.unlock();
                std::string msg = std::string{"Failed to open file: "} + file_ptr->file_name_;
                throw new std::logic_error(msg);
            }
    }

    // Build the handle
    return handle;
}

void WebFileSystem::Read(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes, duckdb::idx_t location) {
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    file_hdl.position_ = location;
    Read(handle, buffer, nr_bytes);
}

int64_t WebFileSystem::Read(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes) {
    DEBUG_TRACE();
    assert(nr_bytes < std::numeric_limits<size_t>::max());
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    assert(file_hdl.file_);
    auto &file = *file_hdl.file_;
    std::shared_lock<std::shared_mutex> file_guard{file.file_mutex_};
    switch (file.data_protocol_) {
        case DataProtocol::BUFFER: {
            auto data_size = file.data_buffer_->Size();
            auto n = std::min<size_t>(nr_bytes, data_size - std::min<size_t>(file_hdl.position_, data_size));
            ::memcpy(buffer, file.data_buffer_->Get().data() + file_hdl.position_, n);
            file_hdl.position_ += n;
            return n;
        }
        case DataProtocol::NATIVE:
        case DataProtocol::BLOB:
        case DataProtocol::HTTP: {
            auto n = duckdb_web_fs_file_read(file.file_id_, buffer, nr_bytes, file_hdl.position_);
            file_hdl.position_ += n;
            return n;
        }
    }
    return 0;
}

void WebFileSystem::Write(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes, duckdb::idx_t location) {
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    file_hdl.position_ = location;
    Write(handle, buffer, nr_bytes);
}

int64_t WebFileSystem::Write(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes) {
    DEBUG_TRACE();
    assert(nr_bytes < std::numeric_limits<size_t>::max());
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    assert(file_hdl.file_);
    auto &file = *file_hdl.file_;
    std::shared_lock<std::shared_mutex> file_guard{file.file_mutex_};
    switch (file.data_protocol_) {
        case DataProtocol::BUFFER: {
            auto end = file_hdl.position_ + nr_bytes;
            if (file.data_buffer_->Size() < end) {
                file.data_buffer_->Resize(end);
            }
            ::memcpy(file.data_buffer_->Get().data() + file_hdl.position_, buffer, nr_bytes);
            file_hdl.position_ = end;
            return nr_bytes;
        }
        case DataProtocol::NATIVE:
        case DataProtocol::BLOB:
        case DataProtocol::HTTP: {
            auto n = duckdb_web_fs_file_write(file.file_id_, buffer, nr_bytes, file_hdl.position_);
            file_hdl.position_ = file_hdl.position_ + n;
            return n;
        }
    }
    return 0;
}

/// Returns the file size of a file handle, returns -1 on error
int64_t WebFileSystem::GetFileSize(duckdb::FileHandle &handle) {
    DEBUG_TRACE();
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    assert(file_hdl.file_);
    auto &file = *file_hdl.file_;
    std::unique_lock<std::shared_mutex> file_guard{file.file_mutex_};
    switch (file.data_protocol_) {
        case DataProtocol::BUFFER:
            assert(file.data_buffer_.has_value());
            return file.data_buffer_->Size();
        case DataProtocol::NATIVE:
        case DataProtocol::BLOB:
        case DataProtocol::HTTP: {
            return duckdb_web_fs_file_get_size(file.file_id_);
        }
    }
    return 0;
}
/// Returns the file last modified time of a file handle, returns timespec with zero on all attributes on error
time_t WebFileSystem::GetLastModifiedTime(duckdb::FileHandle &handle) {
    DEBUG_TRACE();
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    assert(file_hdl.file_);
    auto &file = *file_hdl.file_;
    std::shared_lock<std::shared_mutex> file_guard{file.file_mutex_};
    switch (file.data_protocol_) {
        case DataProtocol::BUFFER:
            return 0;
        case DataProtocol::NATIVE:
        case DataProtocol::BLOB:
        case DataProtocol::HTTP: {
            return duckdb_web_fs_file_get_last_modified_time(file.file_id_);
        }
    }
    return 0;
}
/// Truncate a file to a maximum size of new_size, new_size should be smaller than or equal to the current size of
/// the file
void WebFileSystem::Truncate(duckdb::FileHandle &handle, int64_t new_size) {
    DEBUG_TRACE();
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    assert(file_hdl.file_);
    auto &file = *file_hdl.file_;
    std::unique_lock<std::shared_mutex> file_guard{file_hdl.file_->file_mutex_};
    switch (file.data_protocol_) {
        case DataProtocol::BUFFER:
            file.data_buffer_->Resize(new_size);
            return;
        case DataProtocol::NATIVE:
        case DataProtocol::BLOB:
        case DataProtocol::HTTP: {
            duckdb_web_fs_file_truncate(file.file_id_, new_size);
            return;
        }
    }
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
    auto glob = glob_to_regex(path);
    for (auto [name, file] : files_by_name_) {
        if (std::regex_match(file->file_name_, glob)) {
            results.push_back(std::string{name});
        }
    }
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
