#include "duckdb/web/io/filesystem_buffer.h"

#include <cassert>
#include <cstdint>
#include <cstring>
#include <duckdb/common/file_system.hpp>
#include <iostream>
#include <limits>
#include <memory>
#include <string>
#include <tuple>
#include <utility>

/// Build a frame id
static constexpr uint64_t BuildFrameID(uint16_t file_id, uint64_t page_id = 0) {
    assert(page_id < (1ull << 48));
    return (page_id & ((1ull << 48) - 1)) | (static_cast<uint64_t>(file_id) << 48);
}
/// Returns the file id for a given frame id which is contained in the 16
/// most significant bits of the page id.
static constexpr uint16_t GetSegmentID(uint64_t frame_id) { return frame_id >> 48; }
/// Returns the page id within its file for a given frame id. This
/// corresponds to the 48 least significant bits of the page id.
static constexpr uint64_t GetPageID(uint64_t frame_id) { return frame_id & ((1ull << 48) - 1); }

/// Helper to dump bytes
#if 0
static void dumpBytes(nonstd::span<char> bytes, uint64_t line_width = 30) {
    for (int i = 0; i < bytes.size(); i++) {
        auto c = bytes[i];
        if (i % line_width == 0) std::cout << "\n";
        std::cout << (std::isalnum(c) ? c : '.');
    }
    std::cout << std::endl;
}
#define DEBUG_DUMP_BYTES(bytes) dumpBytes(bytes)
#else
#define DEBUG_DUMP_BYTES(bytes)
#endif

namespace duckdb {
namespace web {
namespace io {

/// Constructor
FileSystemBufferFrame::FileSystemBufferFrame(uint64_t frame_id, list_position fifo_position, list_position lru_position)
    : frame_id(frame_id), access_latch(), fifo_position(fifo_position), lru_position(lru_position) {}

/// Lock the frame
void FileSystemBufferFrame::LockFrame(bool exclusive) {
    if (exclusive) {
        access_latch.lock();
        assert(!locked_exclusively);
        locked_exclusively = true;
    } else {
        access_latch.lock_shared();
    }
}

/// Unlock the frame
void FileSystemBufferFrame::UnlockFrame() {
    if (locked_exclusively) {
        locked_exclusively = false;
        access_latch.unlock();
    } else {
        access_latch.unlock_shared();
    }
}

/// Constructor
FileSystemBuffer::BufferedFile::BufferedFile(uint16_t file_id, std::string_view path,
                                             std::unique_ptr<duckdb::FileHandle> handle)
    : file_id(file_id), path(path), handle(std::move(handle)) {}

/// Constructor
FileSystemBuffer::FileRef::FileRef(FileSystemBuffer& buffer_manager, BufferedFile& file)
    : buffer_manager_(buffer_manager), file_(&file) {
    // Is always constructed with directory latch
    ++file.file_refs;
}

/// Constructor
FileSystemBuffer::FileRef::FileRef(const FileRef& other) : buffer_manager_(other.buffer_manager_), file_(other.file_) {
    std::unique_lock<std::mutex> dir_latch{buffer_manager_.directory_latch};
    ++file_->file_refs;
}

/// Constructor
FileSystemBuffer::FileRef::FileRef(FileRef&& other) : buffer_manager_(other.buffer_manager_), file_(other.file_) {
    other.file_ = nullptr;
}

/// Destructor
FileSystemBuffer::FileRef::~FileRef() { Release(); }

/// Release the file ref
void FileSystemBuffer::FileRef::Release() {
    if (!!file_) {
        std::unique_lock<std::mutex> dir_latch{buffer_manager_.directory_latch};
        buffer_manager_.ReleaseFile(*file_, dir_latch);
        file_ = nullptr;
    }
}

/// Copy assignment
FileSystemBuffer::FileRef& FileSystemBuffer::FileRef::operator=(const FileRef& other) {
    Release();
    assert(&buffer_manager_ == &other.buffer_manager_);
    file_ = other.file_;
    std::unique_lock<std::mutex> dir_latch{buffer_manager_.directory_latch};
    ++file_->file_refs;
    return *this;
}

/// Move assignment
FileSystemBuffer::FileRef& FileSystemBuffer::FileRef::operator=(FileRef&& other) {
    Release();
    assert(&buffer_manager_ == &other.buffer_manager_);
    file_ = other.file_;
    other.file_ = nullptr;
    return *this;
}

/// Constructor
FileSystemBuffer::BufferRef::BufferRef(FileSystemBuffer& buffer_manager, FileSystemBufferFrame& frame)
    : buffer_manager_(buffer_manager), frame_(&frame) {}

/// Copy Constructor
FileSystemBuffer::BufferRef::BufferRef(const BufferRef& other)
    : buffer_manager_(other.buffer_manager_), frame_(other.frame_) {
    assert(!frame_->locked_exclusively);
    {
        std::unique_lock<std::mutex> dir_latch{buffer_manager_.directory_latch};
        frame_->num_users++;
    }
    frame_->LockFrame(false);
}

/// Move Constructor
FileSystemBuffer::BufferRef::BufferRef(BufferRef&& other)
    : buffer_manager_(other.buffer_manager_), frame_(std::move(other.frame_)) {
    other.frame_ = nullptr;
}

/// Copy Constructor
FileSystemBuffer::BufferRef& FileSystemBuffer::BufferRef::operator=(const BufferRef& other) {
    Release();
    assert(!frame_->locked_exclusively);  // Copy assignment of exclusive lock is undefined
    assert(&buffer_manager_ == &other.buffer_manager_);
    frame_ = other.frame_;
    {
        std::unique_lock<std::mutex> dir_latch{buffer_manager_.directory_latch};
        frame_->num_users++;
    }
    frame_->LockFrame(false);
    return *this;
}

/// Move Constructor
FileSystemBuffer::BufferRef& FileSystemBuffer::BufferRef::operator=(BufferRef&& other) {
    Release();
    assert(&buffer_manager_ == &other.buffer_manager_);
    frame_ = other.frame_;
    other.frame_ = nullptr;
    return *this;
}

/// Destructor
FileSystemBuffer::BufferRef::~BufferRef() { Release(); }
/// Constructor
void FileSystemBuffer::BufferRef::Release() {
    if (!!frame_) {
        buffer_manager_.UnfixPage(*frame_, frame_->is_dirty);
        frame_ = nullptr;
    }
}

/// Require a buffer frame to be of a certain size
void FileSystemBuffer::BufferRef::RequireSize(uint64_t n) {
    if (!frame_) return;
    std::unique_lock<std::mutex> dir_latch{buffer_manager_.directory_latch};
    if (n < frame_->data_size) return;

    // Protect the file with the directory latch
    n = std::min<uint64_t>(n, buffer_manager_.GetPageSize());
    auto frame_id = frame_->frame_id;
    auto page_id = GetPageID(frame_id);
    auto file_id = GetSegmentID(frame_id);
    auto file_it = buffer_manager_.files.find(file_id);

    // Segment not found?
    // This is weird and should not happen.
    // (Frame without attached file makes no sense)
    assert(file_it != buffer_manager_.files.end());

    // Increase the buffered file size
    auto required = page_id * buffer_manager_.GetPageSize() + n;
    file_it->second->file_size_buffered = std::max<uint64_t>(file_it->second->file_size_buffered, required);
    frame_->data_size = std::max<uint64_t>(n, frame_->data_size);
}

/// Constructor
FileSystemBuffer::FileSystemBuffer(std::shared_ptr<duckdb::FileSystem> filesystem, uint64_t page_capacity,
                                   uint64_t page_size_bits)
    : page_size_bits(page_size_bits), page_capacity(page_capacity), filesystem(std::move(filesystem)) {}

/// Destructor
FileSystemBuffer::~FileSystemBuffer() {
    // Acquire the directory latch for all file frames
    std::unique_lock dir_latch{directory_latch};
    // Flush all frames
    for (auto it = frames.begin(); it != frames.end(); ++it) {
        assert(it->second.num_users == 0);
        FlushFrame(it->second, dir_latch);
    }
}

FileSystemBuffer::FileRef FileSystemBuffer::OpenFile(std::string_view path,
                                                     std::unique_ptr<duckdb::FileHandle> handle) {
    // Secure directory access
    std::unique_lock dir_latch{directory_latch};
    // Already added?
    if (auto it = files_by_path.find(path); it != files_by_path.end()) {
        return FileRef{*this, *files.at(it->second)};
    }
    // File id overflow?
    if (allocated_file_ids == std::numeric_limits<uint16_t>::max()) {
        // XXX User wants to open more than 65535 files at the same time.
        //     We don't support that.
        throw std::runtime_error("cannot open more than 65535 files");
    }
    // Allocate file id
    uint16_t file_id;
    if (!free_file_ids.empty()) {
        file_id = free_file_ids.top();
        free_file_ids.pop();
    } else {
        file_id = allocated_file_ids++;
    }
    // Create file
    auto file_ptr = std::make_unique<BufferedFile>(file_id, path, std::move(handle));
    auto& file = *file_ptr;
    files.insert({file_id, std::move(file_ptr)});
    if (!file.handle) {
        file.handle = filesystem->OpenFile(
            file.path.c_str(), duckdb::FileFlags::FILE_FLAGS_WRITE | duckdb::FileFlags::FILE_FLAGS_FILE_CREATE);
    }
    file.file_size_persisted = filesystem->GetFileSize(*file.handle);
    file.file_size_buffered = file.file_size_persisted;
    return FileRef{*this, file};
}

void FileSystemBuffer::EvictFileFrames(BufferedFile& file, std::unique_lock<std::mutex>& dir_latch) {
    auto file_id = file.file_id;
    auto lb = frames.lower_bound(BuildFrameID(file_id));
    auto ub = frames.lower_bound(BuildFrameID(file_id + 1));

    auto it = lb;
    while (it != ub && it != frames.end()) {
        auto next = it++;
        FlushFrame(next->second, dir_latch);

        if (it->second.num_users != 0) continue;
        if (next->second.lru_position != lru.end()) {
            lru.erase(next->second.lru_position);
        } else {
            assert(next->second.fifo_position != fifo.end());
            fifo.erase(next->second.fifo_position);
        }
        frames.erase(next);
    }
}

void FileSystemBuffer::GrowFileIfRequired(BufferedFile& file, std::unique_lock<std::mutex>& dir_latch) {
    if (file.file_size_buffered <= file.file_size_persisted) return;
    auto before_truncation = file.file_size_persisted;
    dir_latch.unlock();
    {
        auto block_access = file.BlockFileAccess();
        filesystem->Truncate(*file.handle, file.file_size_buffered);
    }
    dir_latch.lock();
    if (file.file_size_persisted == before_truncation) {
        file.file_size_persisted = file.file_size_buffered;
    }
}

void FileSystemBuffer::ReleaseFile(BufferedFile& file, std::unique_lock<std::mutex>& dir_latch) {
    // Any open file references?
    assert(file.file_refs > file.file_refs_released);
    auto ref_releases = ++file.file_refs_released;
    auto refs = file.file_refs;
    if (refs > ref_releases) return;

    // Flush all file frames.
    // Resolve the next iterator before flushing a frame since we might release the directory latch.
    auto file_id = file.file_id;
    auto lb = frames.lower_bound(BuildFrameID(file_id));
    auto ub = frames.lower_bound(BuildFrameID(file_id + 1));
    auto it = lb;
    while (it != ub && it != frames.end()) {
        auto next = it++;
        FlushFrame(next->second, dir_latch);
    }

    // References while we released the directory latch?
    if (file.file_refs > refs) return;

    // Erase all file frames
    frames.erase(lb, ub);

    // Erase file
    files_by_path.erase(file.path);
    files.erase(file_id);
    free_file_ids.push(file_id);
}

void FileSystemBuffer::LoadFrame(FileSystemBufferFrame& frame, std::unique_lock<std::mutex>& dir_latch) {
    assert(frame.frame_state == FileSystemBufferFrame::LOADING);
    auto file_id = GetSegmentID(frame.frame_id);
    auto page_id = GetPageID(frame.frame_id);
    auto page_size = GetPageSize();

    // Determine the actual size of the frame
    assert(files.count(file_id));
    auto& file = *files.at(file_id);
    frame.data_size = std::min<uint64_t>(file.file_size_persisted - page_id * page_size, GetPageSize());
    frame.is_dirty = false;

    // Read data into frame
    assert(frame.data_size <= GetPageSize());
    dir_latch.unlock();
    {
        auto file_access = file.AccessFile();
        filesystem->Read(*file.handle, frame.buffer.get(), frame.data_size, page_id * page_size);
    }
    dir_latch.lock();

    // Register as loaded
    frame.frame_state = FileSystemBufferFrame::LOADED;
    frame.is_dirty = false;
}

void FileSystemBuffer::FlushFrame(FileSystemBufferFrame& frame, std::unique_lock<std::mutex>& dir_latch) {
    if (!frame.is_dirty || frame.flush_in_progress) return;
    frame.flush_in_progress = true;
    auto file_id = GetSegmentID(frame.frame_id);
    auto page_id = GetPageID(frame.frame_id);
    auto page_size = GetPageSize();

    // Dump frame bytes
    DEBUG_DUMP_BYTES(frame.GetData());

    // Write data from frame
    assert(files.count(file_id));
    auto& file = *files.at(file_id);
    GrowFileIfRequired(file, dir_latch);

    // Register as user to safely release the directory latch.
    // Lock frame as shared during flushing.
    ++frame.num_users;
    dir_latch.unlock();
    frame.LockFrame(false);

    // Write the file
    {
        auto file_access = file.AccessFile();
        filesystem->Write(*file.handle, frame.buffer.get(), frame.data_size, page_id * page_size);
    }

    // Unlock frame to acquire latch
    frame.UnlockFrame();
    dir_latch.lock();
    --frame.num_users;
    frame.is_dirty = false;
    frame.flush_in_progress = false;
}

std::unique_ptr<char[]> FileSystemBuffer::EvictBufferFrame(std::unique_lock<std::mutex>& latch) {
    FileSystemBufferFrame* frame = nullptr;
    while (true) {
        // Find a frame to evict
        frame = [&]() -> FileSystemBufferFrame* {
            // Try FIFO list first
            for (auto* frame : fifo) {
                if (frame->num_users == 0 && frame->frame_state == FileSystemBufferFrame::State::LOADED) {
                    return frame;
                }
            }
            // If FIFO list is empty or all pages in it are in use, try LRU
            for (auto* frame : lru) {
                if (frame->num_users == 0 && frame->frame_state == FileSystemBufferFrame::State::LOADED) {
                    return frame;
                }
            }
            return nullptr;
        }();
        if (!frame) return nullptr;

        // Found a loaded page?
        // Try to evicit it.
        assert(frame->frame_state == FileSystemBufferFrame::State::LOADED);
        frame->frame_state = FileSystemBufferFrame::State::EVICTING;
        if (!frame->is_dirty) break;

        // Flush the frame
        FlushFrame(*frame, latch);

        // Frame must either be evicting or reloaded
        assert(frame->frame_state == FileSystemBufferFrame::State::EVICTING ||
               frame->frame_state == FileSystemBufferFrame::State::RELOADED);
        if (frame->frame_state == FileSystemBufferFrame::State::EVICTING) {
            // Nobody claimed the page while we were evicting it.
            // Otherwise we'd have to retry.
            break;
        }

        // Mark as loaded again and retry
        frame->frame_state = FileSystemBufferFrame::LOADED;
    }

    // Erase from queues
    if (frame->lru_position != lru.end()) {
        lru.erase(frame->lru_position);
    } else {
        assert(frame->fifo_position != fifo.end());
        fifo.erase(frame->fifo_position);
    }
    // Erase from dictionary
    auto buffer = std::move(frame->buffer);
    frames.erase(frame->frame_id);
    return buffer;
}

std::unique_ptr<char[]> FileSystemBuffer::AllocateFrameBuffer(std::unique_lock<std::mutex>& latch) {
    std::unique_ptr<char[]> buffer = nullptr;
    while (frames.size() >= page_capacity) {
        auto evicted = EvictBufferFrame(latch);
        if (evicted) {
            buffer = std::move(evicted);
        }
    }
    if (!buffer) {
        buffer = std::unique_ptr<char[]>{new char[GetPageSize()]};
    }
    return buffer;
}

/// Get the file size
uint64_t FileSystemBuffer::GetFileSize(const FileRef& file) { return file.file_->file_size_persisted; }

/// Fix a page
FileSystemBuffer::BufferRef FileSystemBuffer::FixPage(const FileRef& file_ref, uint64_t page_id, bool exclusive) {
    // Build the frame id
    assert(file_ref.file_ != nullptr);
    auto file_id = file_ref.file_->file_id;
    auto frame_id = BuildFrameID(file_id, page_id);

    // Protect directory access
    std::unique_lock dir_latch{directory_latch};

    // Repeat until we suceed or fail.
    // We might have to wait for a thread that concurrently tries to fix our page.
    // If that thread fails, we try again until we're the one failing.
    while (true) {
        // Does the frame exist already?
        if (auto it = frames.find(frame_id); it != frames.end()) {
            // Increase number of users to prevent eviction when releasing the directory latch.
            auto& frame = it->second;
            ++frame.num_users;

            // Is currently being loaded by another thread?
            // This might happen when multiple threads fix the same page concurrently.
            if (frame.frame_state == FileSystemBufferFrame::NEW) {
                // Wait for other thread to finish.
                // We acquire the frame latch exclusively to block on the loading.
                dir_latch.unlock();
                frame.LockFrame(true);
                frame.UnlockFrame();
                dir_latch.lock();

                // Other thread failed to allocate a buffer for the frame?
                if (frame.frame_state == FileSystemBufferFrame::State::NEW) {
                    // Give up on that frame
                    --frame.num_users;
                    if (frame.num_users == 0) {
                        assert(frame.fifo_position == fifo.end() && frame.lru_position == lru.end());
                        frames.erase(it);
                    }

                    // Try again until we're the one that fails
                    continue;
                }
            }

            /// Is someone currently evicting the page?
            else if (frame.frame_state == FileSystemBufferFrame::State::EVICTING) {
                frame.frame_state = FileSystemBufferFrame::State::RELOADED;
            }

            // Is page in LRU queue?
            if (frame.lru_position != lru.end()) {
                // Update the queue and move it to the end.
                lru.erase(frame.lru_position);
                frame.lru_position = lru.insert(lru.end(), &frame);
            } else {
                // Page was in FIFO queue and was fixed again, move it to LRU
                assert(frame.fifo_position != fifo.end());
                fifo.erase(frame.fifo_position);
                frame.fifo_position = fifo.end();
                frame.lru_position = lru.insert(lru.end(), &frame);
            }

            // Release directory latch and lock frame
            dir_latch.unlock();
            frame.LockFrame(exclusive);
            return BufferRef{*this, frame};
        }
        break;
    }

    // Allocate a buffer frame.
    // Note that this will always succeed since we're (over-)allocating a new buffer if necessary.
    auto buffer = AllocateFrameBuffer(dir_latch);

    // Create a new frame but don't insert it in the queues, yet.
    assert(frames.find(frame_id) == frames.end());
    auto [it, ok] = frames.emplace(std::piecewise_construct, std::forward_as_tuple(frame_id),
                                   std::forward_as_tuple(frame_id, fifo.end(), lru.end()));
    assert(ok);
    auto& frame = it->second;

    // Lock the frame exclusively to secure the loading.
    // We might release the latch while allocating a buffer frame and other threads might see the new frame.
    // I.e. see earlier condition.
    ++frame.num_users;
    frame.LockFrame(true);

    // Load the data into the frame
    frame.frame_state = FileSystemBufferFrame::State::LOADING;
    frame.buffer = std::move(buffer);
    frame.fifo_position = fifo.insert(fifo.end(), &frame);
    LoadFrame(frame, dir_latch);

    // Downgrade the lock (if necessary)
    if (!exclusive) {
        frame.UnlockFrame();
        dir_latch.unlock();
        frame.LockFrame(false);
    } else {
        dir_latch.unlock();
    }

    // Load the data
    return BufferRef{*this, frame};
}

void FileSystemBuffer::UnfixPage(FileSystemBufferFrame& frame, bool is_dirty) {
    // Unlock the frame latch before acquiring the directory latch to avoid deadlocks
    frame.UnlockFrame();
    // Decrease user cound and mark as dirty with directory latch
    std::unique_lock<std::mutex> dir_latch{directory_latch};
    frame.is_dirty = frame.is_dirty || is_dirty;
    --frame.num_users;
}

void FileSystemBuffer::FlushFile(const FileRef& file_ref) {
    std::unique_lock<std::mutex> dir_latch{directory_latch};
    auto file_id = file_ref.file_->file_id;

    // Flush all frames.
    // Resolve the next iterator before flushing a frame since we might release the directory latch.
    auto lb = frames.lower_bound(BuildFrameID(file_id));
    auto ub = frames.lower_bound(BuildFrameID(file_id + 1));
    auto it = lb;
    while (it != ub && it != frames.end()) {
        auto next = it++;
        FlushFrame(next->second, dir_latch);
    }
}

void FileSystemBuffer::FlushFile(std::string_view path) {
    std::unique_lock<std::mutex> dir_latch{directory_latch};
    if (auto file = files_by_path.find(path); file != files_by_path.end()) {
        // Collect frame ids
        auto lb = frames.lower_bound(BuildFrameID(file->second));
        auto ub = frames.lower_bound(BuildFrameID(file->second + 1));

        // Flush all frames.
        // Resolve the next iterator before flushing a frame since we might release the directory latch.
        auto it = lb;
        while (it != ub && it != frames.end()) {
            auto next = it++;
            FlushFrame(next->second, dir_latch);
        }
    }
}

void FileSystemBuffer::Flush() {
    std::unique_lock<std::mutex> dir_latch{directory_latch};

    // Flush all frames.
    // Resolve the next iterator before flushing a frame since we might release the directory latch.
    auto it = frames.begin();
    while (it != frames.end()) {
        auto next = it++;
        FlushFrame(next->second, dir_latch);
    }
}

uint64_t FileSystemBuffer::Read(const FileRef& file, void* out, uint64_t n, duckdb::idx_t offset) {
    // Check upper file boundary first
    auto read_end = std::min<uint64_t>(file.file_->file_size_buffered, offset + n);
    auto read_max = std::min<uint64_t>(n, std::max<uint64_t>(read_end, offset) - offset);
    if (read_max == 0) return 0;

    // Determine page & offset
    auto page_id = offset >> GetPageSizeShift();
    auto skip_here = offset - page_id * GetPageSize();
    auto read_here = std::min<uint64_t>(read_max, GetPageSize() - skip_here);

    // Fix page
    auto page = FixPage(file, page_id, false);

    // Copy page data to buffer
    auto data = page.GetData();
    read_here = std::min<uint64_t>(read_here, data.size());
    std::memcpy(static_cast<char*>(out), data.data() + skip_here, read_here);
    return read_here;
}

uint64_t FileSystemBuffer::Write(const FileRef& file, const void* in, uint64_t bytes, duckdb::idx_t offset) {
    // Determine page & offset
    auto page_id = offset >> GetPageSizeShift();
    auto skip_here = offset - page_id * GetPageSize();
    auto write_here = std::min<uint64_t>(bytes, GetPageSize() - skip_here);

    // Fix page
    auto page = FixPage(file, page_id, false);
    write_here = std::min<uint64_t>(write_here, GetPageSize());
    page.RequireSize(skip_here + write_here);

    // Copy data to page
    auto data = page.GetData();
    std::memcpy(data.data() + skip_here, static_cast<const char*>(in), write_here);
    page.MarkAsDirty();
    return write_here;
}

void FileSystemBuffer::Truncate(const FileRef& file_ref, uint64_t new_size) {
    // Lock out concurrent truncations
    auto* file = file_ref.file_;
    std::unique_lock<std::mutex> truncation{file->truncation_lock};

    // Block all file accesses
    {
        auto block_access = file->BlockFileAccess();
        filesystem->Truncate(*file->handle, new_size);
    }

    // Update file sizes
    std::unique_lock<std::mutex> dir_latch{directory_latch};
    file->file_size_persisted = new_size;
    file->file_size_buffered = new_size;

    // Update all file frames
    auto file_id = file_ref.file_->file_id;
    auto lb = frames.lower_bound(BuildFrameID(file_id));
    auto ub = frames.lower_bound(BuildFrameID(file_id + 1));
    for (auto it = lb; it != ub; ++it) {
        auto& frame = it->second;
        auto page_id = GetPageID(frame.frame_id);
        auto page_begin = page_id * GetPageSize();
        frame.data_size = std::max<size_t>(new_size, page_begin) - page_begin;
    }
}

std::vector<uint64_t> FileSystemBuffer::GetFIFOList() const {
    std::vector<uint64_t> fifo_list;
    fifo_list.reserve(fifo.size());
    for (auto* page : fifo) {
        fifo_list.push_back(page->frame_id);
    }
    return fifo_list;
}

std::vector<uint64_t> FileSystemBuffer::GetLRUList() const {
    std::vector<uint64_t> lru_list;
    lru_list.reserve(lru.size());
    for (auto* page : lru) {
        lru_list.push_back(page->frame_id);
    }
    return lru_list;
}

}  // namespace io
}  // namespace web
}  // namespace duckdb
