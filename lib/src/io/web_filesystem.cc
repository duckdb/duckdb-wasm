#include "duckdb/web/io/web_filesystem.h"

#include <cstdint>
#include <iostream>
#include <mutex>
#include <regex>
#include <shared_mutex>
#include <stdexcept>
#include <string>
#include <vector>

#include "arrow/buffer.h"
#include "arrow/status.h"
#include "arrow/type_fwd.h"
#include "duckdb/common/file_system.hpp"
#include "duckdb/web/io/default_filesystem.h"
#include "duckdb/web/io/glob.h"
#include "duckdb/web/io/web_filesystem.h"
#include "duckdb/web/utils/debug.h"
#include "duckdb/web/utils/scope_guard.h"
#include "duckdb/web/utils/thread.h"
#include "duckdb/web/utils/wasm_response.h"
#include "rapidjson/document.h"
#include "rapidjson/stringbuffer.h"
#include "rapidjson/writer.h"

static const std::function<void(std::string, bool)> *list_files_callback = {};

namespace duckdb {
namespace web {
namespace io {

/// The local state
struct LocalState {
    /// The handles (if any)
    std::unordered_map<size_t, std::unique_ptr<FileHandle>> handles = {};
    /// The glob results (if any)
    std::vector<std::string> glob_results = {};
    /// The error message (if any)
    std::string error_msg = {};
};
/// The mutex for local state dictionary
static std::mutex LOCAL_STATES_MTX;
/// The thread local stats
static std::unordered_map<size_t, std::unique_ptr<LocalState>> LOCAL_STATES;
/// Get the local state
static auto &GetLocalState() {
    std::unique_lock<std::mutex> fs_guard{LOCAL_STATES_MTX};
    auto tid = GetThreadID();
    auto iter = LOCAL_STATES.find(tid);
    if (iter != LOCAL_STATES.end()) return *iter->second;
    auto entry = LOCAL_STATES.insert({tid, std::make_unique<LocalState>()});
    return *entry.first->second;
}
/// Clear the native file handles
static void ClearLocalStates() {
    std::unique_lock<std::mutex> fs_guard{LOCAL_STATES_MTX};
    LOCAL_STATES.clear();
}

/// Stub the filesystem for native tests
#ifndef EMSCRIPTEN
/// This is only used for tests.
static duckdb::FileSystem NATIVE_FS;
/// Get or open a file and throw if something is off
static duckdb::FileHandle &GetOrOpen(size_t file_id) {
    auto file = WebFileSystem::Get()->GetFile(file_id);
    if (!file) {
        throw std::runtime_error("unknown file");
    }
    auto &infos = GetLocalState();
    switch (file->GetDataProtocol()) {
        case WebFileSystem::DataProtocol::NATIVE: {
            assert(file->GetDataURL());
            if (auto iter = infos.handles.find(file_id); iter != infos.handles.end()) {
                return *iter->second;
            }
            auto [it, ok] = infos.handles.insert(
                {file_id, NATIVE_FS.OpenFile(*file->GetDataURL(), duckdb::FileFlags::FILE_FLAGS_FILE_CREATE |
                                                                      duckdb::FileFlags::FILE_FLAGS_WRITE)});
            return *it->second;
        }
        case WebFileSystem::DataProtocol::BUFFER:
        case WebFileSystem::DataProtocol::HTTP:
            throw std::logic_error("data protocol not supported by fake webfs runtime");
    }
    throw std::logic_error("unknown data protocol");
}
#endif

#ifdef EMSCRIPTEN
#define RT_FN(FUNC, IMPL) extern "C" FUNC;
#else
#define RT_FN(FUNC, IMPL) FUNC IMPL;
#endif
RT_FN(void *duckdb_web_fs_file_open(size_t file_id), {
    GetOrOpen(file_id);
    return nullptr;
});
RT_FN(void duckdb_web_fs_file_sync(size_t file_id), { NATIVE_FS.FileSync(GetOrOpen(file_id)); });
RT_FN(void duckdb_web_fs_file_close(size_t file_id), {
    auto &infos = GetLocalState();
    infos.handles.erase(file_id);
});
RT_FN(void duckdb_web_fs_file_truncate(size_t file_id, double new_size), { GetOrOpen(file_id).Truncate(new_size); });
RT_FN(double duckdb_web_fs_file_get_size(size_t file_id), { return GetOrOpen(file_id).GetFileSize(); });
RT_FN(time_t duckdb_web_fs_file_get_last_modified_time(size_t file_id), {
    auto &file = GetOrOpen(file_id);
    return NATIVE_FS.GetLastModifiedTime(file);
});
RT_FN(ssize_t duckdb_web_fs_file_read(size_t file_id, void *buffer, ssize_t bytes, double location), {
    auto &file = GetOrOpen(file_id);
    auto file_size = file.GetFileSize();
    auto safe_offset = std::min<int64_t>(file_size, location);
    auto read_here = std::min<int64_t>(file_size - safe_offset, bytes);
    file.Read(buffer, read_here, safe_offset);
    return read_here;
});
RT_FN(ssize_t duckdb_web_fs_file_write(size_t file_id, void *buffer, ssize_t bytes, double location), {
    auto &file = GetOrOpen(file_id);
    auto file_size = file.GetFileSize();
    auto safe_offset = std::min<int64_t>(file_size, location);
    file.Write(buffer, bytes, location);
    return bytes;
});
RT_FN(void duckdb_web_fs_directory_remove(const char *path, size_t pathLen), {
    NATIVE_FS.RemoveDirectory(std::string{path, pathLen});
});
RT_FN(bool duckdb_web_fs_directory_exists(const char *path, size_t pathLen), {
    return NATIVE_FS.DirectoryExists(std::string{path, pathLen});
});
RT_FN(void duckdb_web_fs_directory_create(const char *path, size_t pathLen), {
    NATIVE_FS.CreateDirectory(std::string{path, pathLen});
});
RT_FN(bool duckdb_web_fs_directory_list_files(const char *path, size_t pathLen), { return false; });
RT_FN(void duckdb_web_fs_glob(const char *path, size_t pathLen), {
    auto &state = GetLocalState();
    state.glob_results = NATIVE_FS.Glob(std::string{path, pathLen});
});
RT_FN(void duckdb_web_fs_file_move(const char *from, size_t fromLen, const char *to, size_t toLen), {
    NATIVE_FS.MoveFile(std::string{from, fromLen}, std::string{to, toLen});
});
RT_FN(bool duckdb_web_fs_file_exists(const char *path, size_t pathLen), {
    return NATIVE_FS.FileExists(std::string{path, pathLen});
});
#undef RT_FN

extern "C" void duckdb_web_fs_glob_add_path(const char *path, size_t path_len) {
    GetLocalState().glob_results.push_back(std::string{path, path_len});
}

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

/// Resolve readahead
ReadAheadBuffer *WebFileSystem::WebFileHandle::ResolveReadAheadBuffer(std::shared_lock<SharedMutex> &file_guard) {
    auto tid = GetThreadID();

    // Already resolved?
    if (readahead_) return readahead_;
    // Check global readahead buffers
    std::unique_lock<LightMutex> fs_guard{fs_.fs_mutex_};
    // Registered in the meantime
    if (readahead_) return readahead_;

    // Already known?
    auto iter = fs_.readahead_buffers_.find(tid);
    if (iter != fs_.readahead_buffers_.end()) return iter->second.get();

    // Create new readahead buffer
    auto ra = std::make_unique<ReadAheadBuffer>();
    auto ra_ptr = ra.get();
    fs_.readahead_buffers_.insert({tid, std::move(ra)});
    readahead_ = ra_ptr;
    return readahead_;
}

/// Close a file handle
void WebFileSystem::WebFileHandle::Close() {
    DEBUG_TRACE();
    // Find file
    if (!file_) return;
    auto &file = *file_;
    file_ = nullptr;

    // Try to lock the file uniquely
    std::unique_lock<SharedMutex> file_guard{file.file_mutex_, std::defer_lock};
    auto have_file_lock = file_guard.try_lock();
    // Additionally acquire the filesystem lock
    std::unique_lock<LightMutex> fs_guard{fs_.fs_mutex_};
    // More than one handle left?
    if (file.handle_count_ > 1) {
        --file.handle_count_;
        return;
    }
    // Failed to lock exclusively?
    if (!have_file_lock) return;
    // Do we need to close explicitly?
    if (file.data_protocol_ != DataProtocol::BUFFER) {
        try {
            fs_guard.unlock();
            duckdb_web_fs_file_close(file.file_id_);
            fs_guard.lock();
        } catch (...) {
        }
    }
    // Erase the file from the file system
    auto file_id = file.file_id_;
    auto file_proto = file.data_protocol_;
    fs_.files_by_name_.erase(file.file_name_);
    auto iter = fs_.files_by_id_.find(file.file_id_);
    auto tmp = std::move(iter->second);
    fs_.files_by_id_.erase(iter);

    // Release lock guards
    fs_guard.unlock();
    file_guard.unlock();
}

static inline bool hasPrefix(std::string_view text, std::string_view prefix) {
    return text.compare(0, prefix.size(), prefix) == 0;
}

static inline WebFileSystem::DataProtocol inferDataProtocol(std::string_view url) {
    // Infer the data protocol from the prefix
    std::string_view data_url = url;
    auto proto = WebFileSystem::DataProtocol::BUFFER;
    if (hasPrefix(url, "http://") || hasPrefix(url, "https://")) {
        proto = WebFileSystem::DataProtocol::HTTP;
    } else if (hasPrefix(url, "file://")) {
        data_url = std::string_view{url}.substr(7);
        proto = WebFileSystem::DataProtocol::NATIVE;
    } else {
        proto = WebFileSystem::DataProtocol::NATIVE;
    }
    return proto;
}

/// Get the info
std::string WebFileSystem::WebFile::GetInfoJSON() const {
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
    doc.AddMember("file_size", static_cast<double>(file_size_), allocator);
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
    assert(WEBFS == nullptr && "Can only register a single WebFileSystem at a time");
    WEBFS = this;
}

/// Destructor
WebFileSystem::~WebFileSystem() {
    WEBFS = nullptr;
    ClearLocalStates();
}

/// Invalidate readaheads
void WebFileSystem::InvalidateReadAheads(size_t file_id, std::unique_lock<SharedMutex> &file_guard) {
    std::unique_lock<LightMutex> fs_guard{fs_mutex_};
    for (auto &ra : readahead_buffers_) {
        ra.second->Invalidate(file_id);
    }
}

/// Register a file URL
arrow::Result<std::unique_ptr<WebFileSystem::WebFileHandle>> WebFileSystem::RegisterFileURL(
    std::string_view file_name, std::string_view file_url, std::optional<uint64_t> file_size) {
    DEBUG_TRACE();
    // Check if the file exists
    std::unique_lock<LightMutex> fs_guard{fs_mutex_};
    auto iter = files_by_name_.find(file_name);
    if (iter != files_by_name_.end()) return arrow::Status::Invalid("File already registered: ", file_name);

    // Allocate a new web file
    auto proto = inferDataProtocol(file_url);
    auto file_id = AllocateFileID();
    auto file = std::make_unique<WebFile>(file_id, file_name, proto);
    file->data_url_ = file_url;
    file->file_size_ = file_size.value_or(0);

    // Register the file
    auto file_ptr = file.get();
    files_by_id_.insert({file_id, std::move(file)});
    files_by_name_.insert({std::string_view{file_ptr->file_name_}, file_ptr});

    // Build the file handle
    return std::make_unique<WebFileHandle>(*this, file_ptr->file_name_, *file_ptr);
}

/// Register a file buffer
arrow::Result<std::unique_ptr<WebFileSystem::WebFileHandle>> WebFileSystem::RegisterFileBuffer(
    std::string_view file_name, DataBuffer file_buffer) {
    DEBUG_TRACE();
    // Check if the file exists
    std::unique_lock<LightMutex> fs_guard{fs_mutex_};
    auto iter = files_by_name_.find(file_name);
    if (iter != files_by_name_.end()) return arrow::Status::Invalid("File already registered: ", file_name);

    // Allocate a new web file
    auto file_id = AllocateFileID();
    auto file = std::make_unique<WebFile>(file_id, file_name, DataProtocol::BUFFER);
    file->file_size_ = file_buffer.Size();
    file->data_buffer_ = std::move(file_buffer);

    // Register the file
    auto file_ptr = file.get();
    files_by_id_.insert({file_id, std::move(file)});
    files_by_name_.insert({std::string_view{file_ptr->file_name_}, file_ptr});

    // Build the file handle
    return std::make_unique<WebFileHandle>(*this, file_ptr->file_name_, *file_ptr);
}

/// Try to drop a file
bool WebFileSystem::TryDropFile(std::string_view file_name) {
    DEBUG_TRACE();
    std::unique_lock<LightMutex> fs_guard{fs_mutex_};
    auto iter = files_by_name_.find(file_name);
    if (iter == files_by_name_.end()) return true;
    assert(iter->second->handle_count_ > 0);
    return false;
}

/// Set a file descriptor
arrow::Status WebFileSystem::SetFileDescriptor(uint32_t file_id, uint32_t file_descriptor) {
    DEBUG_TRACE();
    std::unique_lock<LightMutex> fs_guard{fs_mutex_};
    auto iter = files_by_id_.find(file_id);
    if (iter == files_by_id_.end()) return arrow::Status::Invalid("Invalid file id: ", file_id);
    iter->second->data_fd_ = file_descriptor;
    return arrow::Status::OK();
}

/// Get a file info as JSON string
arrow::Result<std::string> WebFileSystem::GetFileInfoJSON(uint32_t file_id) {
    DEBUG_TRACE();
    std::unique_lock<LightMutex> fs_guard{fs_mutex_};
    auto iter = files_by_id_.find(file_id);
    if (iter == files_by_id_.end()) return arrow::Status::Invalid("Invalid file id: ", file_id);
    auto &file = *iter->second;
    return file.GetInfoJSON();
}

/// Configure file statistics
void WebFileSystem::ConfigureFileStatistics(std::shared_ptr<FileStatisticsRegistry> registry) {
    std::unique_lock<LightMutex> fs_guard{fs_mutex_};
    file_statistics_ = registry;
}

/// Enable file statistics
void WebFileSystem::CollectFileStatistics(std::string_view path, std::shared_ptr<FileStatisticsCollector> collector) {
    std::unique_lock<LightMutex> fs_guard{fs_mutex_};
    if (!file_statistics_) return;

    // No file currently known?
    auto files_iter = files_by_name_.find(path);
    if (files_iter == files_by_name_.end()) return;
    if (collector && files_iter->second->file_stats_) return;
    if (!collector && !files_iter->second->file_stats_) return;

    // Construct handle to release the filesystem lock
    WebFileHandle file_hdl{*this, files_iter->second->file_name_, *files_iter->second};
    fs_guard.unlock();

    // Set file stats
    std::unique_lock<SharedMutex> file_guard{files_iter->second->file_mutex_};
    file_hdl.file_->file_stats_ = collector;
    file_hdl.file_->file_stats_->Resize(file_hdl.file_->file_size_);
}

/// Open a file
std::unique_ptr<duckdb::FileHandle> WebFileSystem::OpenFile(const string &url, uint8_t flags, FileLockType lock,
                                                            FileCompressionType compression) {
    DEBUG_TRACE();
    std::unique_lock<LightMutex> fs_guard{fs_mutex_};

    // Determine url type
    std::string_view data_url = url;
    DataProtocol data_proto = inferDataProtocol(url);

    // New file?
    WebFile *file_ptr = nullptr;
    auto iter = files_by_name_.find(data_url);
    if (iter == files_by_name_.end()) {
        // Create file
        auto file = std::make_unique<WebFile>(AllocateFileID(), data_url, data_proto);
        auto file_id = file->file_id_;
        file_ptr = file.get();
        file_ptr->data_url_ = url;

        // Register in directory
        std::string_view file_name{file->file_name_};
        files_by_id_.insert({file_id, std::move(file)});
        files_by_name_.insert({file_name, file.get()});
    } else {
        file_ptr = iter->second;
    }
    auto handle = std::make_unique<WebFileHandle>(*this, file_ptr->file_name_, *file_ptr);

    // Lock the file
    fs_guard.unlock();
    std::unique_lock<SharedMutex> file_guard{file_ptr->file_mutex_};

    // Try to open the file (if necessary)
    switch (file_ptr->data_protocol_) {
        case DataProtocol::BUFFER:
            if ((flags & duckdb::FileFlags::FILE_FLAGS_FILE_CREATE_NEW) != 0) {
                file_ptr->data_buffer_->Resize(0);
                file_ptr->file_size_ = 0;
            }
            break;
        case DataProtocol::NATIVE:
            // Open the file
            if (file_ptr->data_fd_.has_value()) break;
        case DataProtocol::HTTP:
            try {
                // Open the file
                auto *copy = duckdb_web_fs_file_open(file_ptr->file_id_);

                // Was the file fully copied into wasm memory?
                // This can happen if the data source does not support HTTP range requests.
                if (copy != nullptr) {
                    std::unique_ptr<uint32_t[]> copy_desc(reinterpret_cast<uint32_t *>(copy));
                    auto *buffer_ptr = reinterpret_cast<char *>(static_cast<uintptr_t>(copy_desc.get()[0]));
                    auto buffer_length = copy_desc.get()[1];
                    std::unique_ptr<char[]> buffer{buffer_ptr};
                    file_ptr->data_protocol_ = DataProtocol::BUFFER;
                    file_ptr->data_buffer_ = DataBuffer{std::move(buffer), static_cast<size_t>(buffer_length)};
                } else {
                    // Otherwise resolve the file size
                    file_ptr->file_size_ = duckdb_web_fs_file_get_size(file_ptr->file_id_);
                }
                // Truncate file?
                if ((flags & duckdb::FileFlags::FILE_FLAGS_FILE_CREATE_NEW) != 0) {
                    file_guard.unlock();
                    Truncate(*handle, 0);
                    file_guard.lock();
                }

            } catch (...) {
                /// Something wen't wrong, abort opening the file
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

    // Statistics tracking?
    if (file_statistics_) {
        if (auto stats = file_statistics_->FindCollector(file_ptr->file_name_); !!stats) {
            stats->Resize(file_ptr->file_size_);
            file_ptr->file_stats_ = stats;
        }
    }

    // Build the handle
    return handle;
}

void WebFileSystem::Read(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes, duckdb::idx_t location) {
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    auto file_size = file_hdl.file_->file_size_;
    auto reader = static_cast<char *>(buffer);
    file_hdl.position_ = location;
    while (nr_bytes > 0 && location < file_size) {
        auto n = Read(handle, reader, nr_bytes);
        reader += n;
        nr_bytes -= n;
    }
}

int64_t WebFileSystem::Read(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes) {
    DEBUG_TRACE();
    assert(nr_bytes < std::numeric_limits<size_t>::max());
    // Get the file handle
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    assert(file_hdl.file_);
    auto &file = *file_hdl.file_;
    // Read with shared lock to protect against truncation
    std::shared_lock<SharedMutex> file_guard{file.file_mutex_};
    // Perform the actual read
    switch (file.data_protocol_) {
        // Read buffers directly from WASM memory
        case DataProtocol::BUFFER: {
            auto file_size = file.data_buffer_->Size();
            auto n = std::min<size_t>(nr_bytes, file_size - std::min<size_t>(file_hdl.position_, file_size));
            ::memcpy(buffer, file.data_buffer_->Get().data() + file_hdl.position_, n);
            // Register read
            if (file.file_stats_) {
                file.file_stats_->RegisterFileReadCached(file_hdl.position_, n);
            }
            // Update position
            file_hdl.position_ += n;
            return n;
        }

        // Just read with the filesystem api
        case DataProtocol::NATIVE:
        case DataProtocol::HTTP: {
            if (auto ra = file_hdl.ResolveReadAheadBuffer(file_guard)) {
                auto reader = [&](auto *out, size_t n, duckdb::idx_t ofs) {
                    return duckdb_web_fs_file_read(file.file_id_, out, n, ofs);
                };
                auto n = ra->Read(file.file_id_, file.file_size_, buffer, nr_bytes, file_hdl.position_, reader,
                                  file.file_stats_.get());
                file_hdl.position_ += n;
                return n;
            } else {
                auto n = duckdb_web_fs_file_read(file.file_id_, buffer, nr_bytes, file_hdl.position_);
                // Register read
                if (file.file_stats_) {
                    file.file_stats_->RegisterFileReadCold(file_hdl.position_, n);
                }
                // Update position
                file_hdl.position_ += n;
                return n;
            }
        }
    }
    return 0;
}

void WebFileSystem::Write(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes, duckdb::idx_t location) {
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    auto file_size = file_hdl.file_->file_size_;
    auto writer = static_cast<char *>(buffer);
    file_hdl.position_ = location;
    while (nr_bytes > 0 && location < file_size) {
        auto n = Write(handle, writer, nr_bytes);
        writer += n;
        nr_bytes -= n;
    }
}

int64_t WebFileSystem::Write(duckdb::FileHandle &handle, void *buffer, int64_t nr_bytes) {
    DEBUG_TRACE();
    assert(nr_bytes < std::numeric_limits<size_t>::max());
    // Get the file handle
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    assert(file_hdl.file_);
    auto &file = *file_hdl.file_;
    // First lock shared to protect against concurrent truncation.
    // XXX Check whether we can downgrade this to a shared lock (-> readahead invalidation).
    std::unique_lock<SharedMutex> file_guard{file.file_mutex_};
    // Do the actual write
    size_t bytes_read = 0;
    switch (file.data_protocol_) {
        // Buffers are trans
        case DataProtocol::BUFFER: {
            auto pos = file_hdl.position_.load();
            auto end = file_hdl.position_ + nr_bytes;

            // Need to resize the buffer?
            // Upgrade to exclusive lock.
            if (end > file.data_buffer_->Size()) {
                file_guard.unlock();
                Truncate(handle, std::max<size_t>(end, file.file_size_));
                file_guard.lock();
            }

            // Copy data to buffer
            ::memcpy(file.data_buffer_->Get().data() + file_hdl.position_, buffer, nr_bytes);
            file_hdl.position_ = end;
            bytes_read = nr_bytes;

            // Register write
            if (file.file_stats_) {
                file.file_stats_->Resize(file.file_size_);
                file.file_stats_->RegisterFileWrite(pos, end);
            }
            break;
        }
        case DataProtocol::NATIVE: {
            auto end = file_hdl.position_ + nr_bytes;
            size_t n;

            // Write past end?
            if (end > file.file_size_) {
                // Upgrade to exclusive lock
                file_guard.unlock();
                std::unique_lock<SharedMutex> appender_guard{file.file_mutex_};
                n = duckdb_web_fs_file_write(file.file_id_, buffer, nr_bytes, file_hdl.position_);
                assert(n == nr_bytes);
                file.file_size_ = std::max<size_t>(file_hdl.position_ + n, file.file_size_);

                // Register write
                if (file.file_stats_) {
                    file.file_stats_->Resize(file.file_size_);
                    file.file_stats_->RegisterFileWrite(file_hdl.position_, n);
                }

                // Update position
                file_hdl.position_ = file_hdl.position_ + n;
            } else {
                // Write is in bounds, rely on atomicity of filesystem writes
                n = duckdb_web_fs_file_write(file.file_id_, buffer, nr_bytes, file_hdl.position_);

                // Register write
                if (file.file_stats_) {
                    file.file_stats_->RegisterFileWrite(file_hdl.position_, n);
                }

                // Update position
                file_hdl.position_ = file_hdl.position_ + n;
            }
            bytes_read = n;
            break;
        }
        case DataProtocol::HTTP: {
            // XXX How should handle writing HTTP files?
            throw std::runtime_error("writing to HTTP files is not implemented");
        }
    }
    // Invalidate all readahead buffers
    InvalidateReadAheads(file.file_id_, file_guard);
    return bytes_read;
}

/// Returns the file size of a file handle, returns -1 on error
int64_t WebFileSystem::GetFileSize(duckdb::FileHandle &handle) {
    DEBUG_TRACE();
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    assert(file_hdl.file_);
    auto &file = *file_hdl.file_;
    std::shared_lock<SharedMutex> file_guard{file.file_mutex_};
    return file.file_size_;
}
/// Returns the file last modified time of a file handle, returns timespec with zero on all attributes on error
time_t WebFileSystem::GetLastModifiedTime(duckdb::FileHandle &handle) {
    DEBUG_TRACE();
    // Get the file handle
    auto &file_hdl = static_cast<WebFileHandle &>(handle);
    assert(file_hdl.file_);
    auto &file = *file_hdl.file_;

    // Acquire the file mutex to procted against a procotol switch
    std::shared_lock<SharedMutex> file_guard{file.file_mutex_};
    switch (file.data_protocol_) {
        case DataProtocol::BUFFER:
            return 0;
        case DataProtocol::NATIVE:
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

    // Acquire unique file latch
    std::unique_lock<SharedMutex> file_guard{file_hdl.file_->file_mutex_};
    // Resize the buffer
    switch (file.data_protocol_) {
        case DataProtocol::BUFFER:
            file.data_buffer_->Resize(new_size);
            break;
        case DataProtocol::NATIVE:
        case DataProtocol::HTTP: {
            duckdb_web_fs_file_truncate(file.file_id_, new_size);
            break;
        }
    }
    // Resize the statistics buffer
    if (file.file_stats_) {
        file.file_stats_->Resize(file.file_size_);
    }
    // Update the file size
    file.file_size_ = new_size;
    // Invalidate readahead buffers
    InvalidateReadAheads(file.file_id_, file_guard);
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
    std::unique_lock<LightMutex> fs_guard{fs_mutex_};
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
    std::unique_lock<LightMutex> fs_guard{fs_mutex_};
    std::vector<std::string> results;
    auto glob = glob_to_regex(path);
    for (auto [name, file] : files_by_name_) {
        if (std::regex_match(file->file_name_, glob)) {
            results.push_back(std::string{name});
        }
    }
    auto &state = GetLocalState();
    duckdb_web_fs_glob(path.c_str(), path.size());
    for (auto &path : state.glob_results) {
        results.push_back(std::move(path));
    }
    return std::move(results);
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
