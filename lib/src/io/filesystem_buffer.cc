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

static constexpr size_t MAX_EXCEEDED_PAGES = 100;

/// Build a frame id
static constexpr uint64_t BuildFrameID(uint16_t segment_id, uint64_t page_id = 0) {
    assert(page_id < (1ull << 48));
    return (page_id & ((1ull << 48) - 1)) | (static_cast<uint64_t>(segment_id) << 48);
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
    : frame_id(frame_id), frame_latch(), fifo_position(fifo_position), lru_position(lru_position) {}

/// Lock the frame
void FileSystemBufferFrame::Lock(bool exclusive) {
    if (exclusive) {
        frame_latch.lock();
        assert(!locked_exclusively);
        locked_exclusively = true;
    } else {
        frame_latch.lock_shared();
    }
}

/// Unlock the frame
void FileSystemBufferFrame::Unlock() {
    if (locked_exclusively) {
        frame_latch.unlock();
        locked_exclusively = false;
    } else {
        frame_latch.unlock_shared();
    }
}

/// Constructor
FileSystemBuffer::SegmentFile::SegmentFile(uint16_t segment_id, std::string_view path,
                                           std::unique_ptr<duckdb::FileHandle> handle)
    : segment_id(segment_id), path(path), handle(std::move(handle)), references(0) {}

/// Constructor
FileSystemBuffer::FileRef::FileRef(std::shared_ptr<FileSystemBuffer> buffer_manager, SegmentFile& file)
    : buffer_manager_(std::move(buffer_manager)), file_(&file) {
    ++file.references;
}

/// Constructor
FileSystemBuffer::FileRef::FileRef(const FileRef& other) : buffer_manager_(other.buffer_manager_), file_(other.file_) {
    ++file_->references;
}

/// Constructor
FileSystemBuffer::FileRef::FileRef(FileRef&& other)
    : buffer_manager_(std::move(other.buffer_manager_)), file_(other.file_) {
    other.buffer_manager_ = nullptr;
    other.file_ = nullptr;
}

/// Destructor
FileSystemBuffer::FileRef::~FileRef() { Release(); }

/// Release the file ref
void FileSystemBuffer::FileRef::Release() {
    if (!!file_) {
        std::unique_lock<std::mutex> latch{buffer_manager_->directory_latch};
        buffer_manager_->ReleaseFile(*file_, latch);
        buffer_manager_ = nullptr;
        file_ = nullptr;
    }
}

/// Copy assignment
FileSystemBuffer::FileRef& FileSystemBuffer::FileRef::operator=(const FileRef& other) {
    Release();
    buffer_manager_ = other.buffer_manager_;
    file_ = other.file_;
    ++file_->references;
    return *this;
}

/// Move assignment
FileSystemBuffer::FileRef& FileSystemBuffer::FileRef::operator=(FileRef&& other) {
    Release();
    buffer_manager_ = std::move(other.buffer_manager_);
    file_ = other.file_;
    other.file_ = nullptr;
    return *this;
}

/// Constructor
FileSystemBuffer::BufferRef::BufferRef(std::shared_ptr<FileSystemBuffer> buffer_manager, FileSystemBufferFrame& frame)
    : buffer_manager_(std::move(buffer_manager)), frame_(&frame) {}

/// Copy Constructor
FileSystemBuffer::BufferRef::BufferRef(const BufferRef& other)
    : buffer_manager_(other.buffer_manager_), frame_(other.frame_) {
    assert(!frame_->locked_exclusively);
    frame_->Lock(false);
}

/// Move Constructor
FileSystemBuffer::BufferRef::BufferRef(BufferRef&& other)
    : buffer_manager_(std::move(other.buffer_manager_)), frame_(std::move(other.frame_)) {
    other.buffer_manager_ = nullptr;
    other.frame_ = nullptr;
}

/// Copy Constructor
FileSystemBuffer::BufferRef& FileSystemBuffer::BufferRef::operator=(const BufferRef& other) {
    Release();
    assert(!frame_->locked_exclusively);  // Copy assignment of exclusive lock is undefined
    buffer_manager_ = other.buffer_manager_;
    frame_ = other.frame_;
    frame_->Lock(false);
    return *this;
}

/// Move Constructor
FileSystemBuffer::BufferRef& FileSystemBuffer::BufferRef::operator=(BufferRef&& other) {
    Release();
    buffer_manager_ = std::move(other.buffer_manager_);
    frame_ = other.frame_;
    other.buffer_manager_ = nullptr;
    other.frame_ = nullptr;
    return *this;
}

/// Destructor
FileSystemBuffer::BufferRef::~BufferRef() { Release(); }
/// Constructor
void FileSystemBuffer::BufferRef::Release() {
    if (!!frame_) {
        buffer_manager_->UnfixPage(*frame_, frame_->is_dirty);
        buffer_manager_ = nullptr;
        frame_ = nullptr;
    }
}

/// Require a buffer frame to be of a certain size
void FileSystemBuffer::BufferRef::RequireSize(uint64_t n) {
    // Nothing to do?
    if (!frame_ || n < frame_->data_size) return;

    // Protect the segment with the directory latch
    std::unique_lock<std::mutex> lock{buffer_manager_->directory_latch};
    n = std::min<uint64_t>(n, buffer_manager_->GetPageSize());
    auto frame_id = frame_->frame_id;
    auto page_id = GetPageID(frame_id);
    auto segment_id = GetSegmentID(frame_id);
    auto file_it = buffer_manager_->segments.find(segment_id);

    // Segment not found?
    // This is weird and should not happen.
    // (Frame without attached file makes no sense)
    assert(file_it != buffer_manager_->segments.end());

    // Increase the buffered file size
    auto required = page_id * buffer_manager_->GetPageSize() + n;
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
    std::unique_lock latch{directory_latch};
    // Increase the number of users to prevent eviction.
    // Increasing wont hurt since we're throwing away all memory anyway.
    for (auto& entry : frames) {
        ++entry.second.num_users;
    }
    // Flush all frames
    for (auto& entry : frames) {
        assert(entry.second.num_users == 0);
        FlushFrame(entry.second, latch);
    }
}

FileSystemBuffer::FileRef FileSystemBuffer::OpenFile(std::string_view path,
                                                     std::unique_ptr<duckdb::FileHandle> handle) {
    // Secure directory access
    std::unique_lock latch{directory_latch};
    // Already added?
    if (auto it = segments_by_path.find(path); it != segments_by_path.end()) {
        return FileRef{shared_from_this(), *segments.at(it->second)};
    }
    // File id overflow?
    if (allocated_segment_ids == std::numeric_limits<uint16_t>::max()) {
        // XXX User wants to open more than 65535 files at the same time.
        //     We don't support that.
        throw std::runtime_error("cannot open more than 65535 files");
    }
    // Allocate file id
    uint16_t segment_id;
    if (!free_segment_ids.empty()) {
        segment_id = free_segment_ids.top();
        free_segment_ids.pop();
    } else {
        segment_id = allocated_segment_ids++;
    }
    // Create file
    auto file_ptr = std::make_unique<SegmentFile>(segment_id, path, std::move(handle));
    auto& file = *file_ptr;
    segments.insert({segment_id, std::move(file_ptr)});
    if (!file.handle) {
        file.handle = filesystem->OpenFile(
            file.path.c_str(), duckdb::FileFlags::FILE_FLAGS_WRITE | duckdb::FileFlags::FILE_FLAGS_FILE_CREATE);
    }
    file.file_size_persisted = filesystem->GetFileSize(*file.handle);
    file.file_size_buffered = file.file_size_persisted;
    return FileRef{shared_from_this(), file};
}

void FileSystemBuffer::EvictFileFrames(SegmentFile& file, std::unique_lock<std::mutex>& latch) {
    auto segment_id = file.segment_id;
    auto lb = frames.lower_bound(BuildFrameID(segment_id));
    auto ub = frames.lower_bound(BuildFrameID(segment_id + 1));

    // Collect all files protected by latch
    std::vector<std::map<uint64_t, FileSystemBufferFrame>::iterator> tmp;
    for (auto it = lb; it != ub; ++it) {
        ++it->second.num_users;
        tmp.push_back(it);
    }
    // Flush all frames
    for (auto it : tmp) {
        FlushFrame(it->second, latch);
        if (it->second.lru_position != lru.end()) {
            lru.erase(it->second.lru_position);
        } else {
            assert(it->second.fifo_position != fifo.end());
            fifo.erase(it->second.fifo_position);
        }
    }
    frames.erase(lb, ub);
}

void FileSystemBuffer::GrowFileIfRequired(SegmentFile& file, std::unique_lock<std::mutex>& latch) {
    if (file.file_size_buffered <= file.file_size_persisted) return;
    latch.unlock();
    filesystem->Truncate(*file.handle, file.file_size_buffered);
    file.file_size_persisted = file.file_size_buffered;
    latch.lock();
}

void FileSystemBuffer::ReleaseFile(SegmentFile& file, std::unique_lock<std::mutex>& latch) {
    // Any open file references?
    assert(file.references > 0);
    --file.references;
    if (file.references > 0) return;

    // Evict all file frames
    EvictFileFrames(file, latch);

    // Release file id
    segments_by_path.erase(file.path);
    auto segment_id = file.segment_id;
    segments.erase(segment_id);
    free_segment_ids.push(segment_id);
}

void FileSystemBuffer::LoadFrame(FileSystemBufferFrame& frame, std::unique_lock<std::mutex>& latch) {
    assert(frame.frame_state == FileSystemBufferFrame::LOADING);
    auto segment_id = GetSegmentID(frame.frame_id);
    auto page_id = GetPageID(frame.frame_id);
    auto page_size = GetPageSize();

    // Determine the actual size of the frame
    assert(segments.count(segment_id));
    auto& file = *segments.at(segment_id);
    frame.data_size = std::min<uint64_t>(file.file_size_persisted - page_id * page_size, GetPageSize());
    frame.is_dirty = false;

    // Read data into frame
    assert(frame.data_size <= GetPageSize());
    latch.unlock();
    filesystem->Read(*file.handle, frame.buffer.get(), frame.data_size, page_id * page_size);
    latch.lock();

    // Register as loaded
    frame.frame_state = FileSystemBufferFrame::LOADED;
    frame.is_dirty = false;
}

void FileSystemBuffer::FlushFrame(FileSystemBufferFrame& frame, std::unique_lock<std::mutex>& latch) {
    if (!frame.is_dirty) return;
    auto segment_id = GetSegmentID(frame.frame_id);
    auto page_id = GetPageID(frame.frame_id);
    auto page_size = GetPageSize();

    // Dump frame bytes
    DEBUG_DUMP_BYTES(frame.GetData());

    // Write data from frame
    assert(segments.count(segment_id));
    auto& file = *segments.at(segment_id);
    GrowFileIfRequired(file, latch);

    // Register as user to safely release the directory latch.
    // Lock frame as shared.
    ++frame.num_users;
    latch.unlock();
    frame.Lock(false);

    // Write frame to file
    filesystem->Write(*file.handle, frame.buffer.get(), frame.data_size, page_id * page_size);

    // Unlock frame to acquire latch
    frame.Unlock();
    latch.lock();
    --frame.num_users;
    frame.is_dirty = false;
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

        // Mark as loaded and retry
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
    if (frames.size() >= page_capacity) {
        // Evict a frame if we execeeded the capacity
        if (auto buffer = EvictBufferFrame(latch); buffer) {
            return buffer;
        }
        // Exceeds threshold?
        if ((frames.size() - page_capacity) > MAX_EXCEEDED_PAGES) {
            return nullptr;
        }
    }
    // Allocate a new frame buffer
    return std::unique_ptr<char[]>{new char[GetPageSize()]};
}

/// Get the file size
uint64_t FileSystemBuffer::GetFileSize(const FileRef& file) { return file.file_->file_size_persisted; }

/// Fix a page
FileSystemBuffer::BufferRef FileSystemBuffer::FixPage(const FileRef& file_ref, uint64_t page_id, bool exclusive) {
    // Does the page exist?
    assert(file_ref.file_ != nullptr);
    auto segment_id = file_ref.file_->segment_id;
    auto frame_id = BuildFrameID(segment_id, page_id);

    // Protect directory access
    std::unique_lock latch{directory_latch};

    // Repeat until we suceed or fail.
    // We might have to wait for a thread that concurrently tries to fix our page.
    // If that thread fails, we try again until we're the one failing.
    while (true) {
        // Does the frame exist already?
        if (auto it = frames.find(frame_id); it != frames.end()) {
            // Increase number of users to prevent eviction when releasing the directory latch.
            auto& frame = it->second;
            ++frame.num_users;

            /// Is someone currently evicting the page?
            if (frame.frame_state == FileSystemBufferFrame::State::EVICTING) {
                frame.frame_state = FileSystemBufferFrame::State::RELOADED;
            }

            // Is currently being loaded by another thread?
            // This might happen when multiple threads fix the same page concurrently.
            else if (frame.frame_state == FileSystemBufferFrame::NEW) {
                // Wait for other thread to finish.
                // We acquire the frame latch exclusively to block on the loading.
                latch.unlock();
                frame.Lock(true);
                frame.Unlock();
                latch.lock();

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
            latch.unlock();
            frame.Lock(exclusive);
            return BufferRef{shared_from_this(), frame};
        } else {
            break;
        }
    }

    // Allocate a frame buffer
    auto buffer = AllocateFrameBuffer(latch);

    // Create a new page and don't insert it in the queues, yet.
    assert(frames.find(frame_id) == frames.end());
    auto [it, ok] = frames.emplace(std::piecewise_construct, std::forward_as_tuple(frame_id),
                                   std::forward_as_tuple(frame_id, fifo.end(), lru.end()));
    assert(ok);
    auto& frame = it->second;
    ++frame.num_users;

    // Lock the frame exclusively to secure the loading.
    // We might release the latch while allocating a buffer frame and other threads might see the new frame.
    frame.Lock(true);

    // Allocation failed?
    if (buffer == nullptr) {
        --frame.num_users;
        frame.Unlock();
        if (frame.num_users == 0) {
            assert(frame.fifo_position == fifo.end() && frame.lru_position == lru.end());
            frames.erase(frame_id);
        }
        throw FileSystemBufferFullError();
    }

    // Load the data into the frame
    frame.frame_state = FileSystemBufferFrame::State::LOADING;
    frame.buffer = std::move(buffer);
    frame.fifo_position = fifo.insert(fifo.end(), &frame);
    LoadFrame(frame, latch);

    // Downgrade the lock (if necessary)
    frame.Unlock();
    latch.unlock();
    frame.Lock(exclusive);

    // Load the data
    return BufferRef{shared_from_this(), frame};
}

void FileSystemBuffer::UnfixPage(FileSystemBufferFrame& frame, bool is_dirty) {
    // Unlock the page latch before acquiring the directory latch to avoid deadlocks
    frame.Unlock();
    // Mark as dirty
    std::unique_lock<std::mutex> latch{directory_latch};
    frame.is_dirty = frame.is_dirty || is_dirty;
    --frame.num_users;
}

void FileSystemBuffer::FlushFile(const FileRef& file_ref) {
    std::unique_lock<std::mutex> latch{directory_latch};
    auto segment_id = file_ref.file_->segment_id;

    // Collect frame ids
    auto lb = frames.lower_bound(BuildFrameID(segment_id));
    auto ub = frames.lower_bound(BuildFrameID(segment_id + 1));
    std::vector<std::map<uint64_t, FileSystemBufferFrame>::iterator> tmp;
    for (auto it = lb; it != ub; ++it) {
        tmp.push_back(it);
    }

    // Flush frames
    for (auto it : tmp) {
        FlushFrame(it->second, latch);
    }
}

void FileSystemBuffer::FlushFile(std::string_view path) {
    std::unique_lock<std::mutex> latch{directory_latch};
    if (auto file = segments_by_path.find(path); file != segments_by_path.end()) {
        // Collect frame ids
        auto lb = frames.lower_bound(BuildFrameID(file->second));
        auto ub = frames.lower_bound(BuildFrameID(file->second + 1));
        std::vector<std::map<uint64_t, FileSystemBufferFrame>::iterator> tmp;
        for (auto it = lb; it != ub; ++it) {
            tmp.push_back(it);
        }

        // Flush frames
        for (auto& it : tmp) {
            FlushFrame(it->second, latch);
        }
    }
}

void FileSystemBuffer::Flush() {
    std::unique_lock<std::mutex> latch{directory_latch};

    // Collect frame ids
    std::vector<std::map<uint64_t, FileSystemBufferFrame>::iterator> tmp;
    for (auto it = frames.begin(); it != frames.end(); ++it) {
        tmp.push_back(it);
    }
    // Flush frames
    for (auto& it : tmp) {
        FlushFrame(it->second, latch);
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
    // Lock directory for frame eviction
    std::unique_lock<std::mutex> latch{directory_latch};

    // Evict all frames before truncation
    auto* file = file_ref.file_;
    EvictFileFrames(*file, latch);
    filesystem->Truncate(*file->handle, new_size);
    file->file_size_persisted = new_size;
    file->file_size_buffered = file->file_size_persisted;
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
