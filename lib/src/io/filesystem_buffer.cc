#include "duckdb/web/io/filesystem_buffer.h"

#include <cassert>
#include <cstdint>
#include <cstring>
#include <duckdb/common/file_system.hpp>
#include <duckdb/parser/parser.hpp>
#include <iostream>
#include <limits>
#include <memory>
#include <mutex>
#include <shared_mutex>
#include <string>
#include <tuple>
#include <utility>
#include <variant>

/// Build a frame id
static constexpr uint64_t BuildFrameID(uint16_t file_id, uint64_t page_id = 0) {
    assert(page_id < (1ull << 48));
    return (page_id & ((1ull << 48) - 1)) | (static_cast<uint64_t>(file_id) << 48);
}
/// Returns the file id for a given frame id which is contained in the 16
/// most significant bits of the page id.
static constexpr uint16_t GetFileID(uint64_t frame_id) { return frame_id >> 48; }
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
FileSystemBuffer::BufferFrame::BufferFrame(BufferedFile& file, uint64_t frame_id, list_position fifo_position,
                                           list_position lru_position)
    : file(file), frame_id(frame_id), fifo_position(fifo_position), lru_position(lru_position), frame_latch() {
    ++file.num_frames;
}

/// Constructor
FileSystemBuffer::BufferRef::BufferRef(std::shared_ptr<FileRef> file, BufferFrame& frame, FrameGuard frame_guard)
    : file_(file), frame_(&frame), frame_guard_(std::move(frame_guard)) {}

/// Release a buffer ref
void FileSystemBuffer::BufferRef::Release() {
    if (!frame_) return;
    auto& buffer = file_->buffer_;

    // Decrease user cound and mark as dirty with directory latch
    std::unique_lock<std::mutex> dir_guard{buffer.directory_latch};
    --frame_->num_users;
    frame_ = nullptr;

    // Release a frame lock
    std::visit([](auto&& g) { g.release(); }, frame_guard_);
}

/// Constructor
FileSystemBuffer::FileRef::FileRef(FileSystemBuffer& buffer)
    : buffer_(buffer), file_(nullptr), file_guard_(std::monostate{}), buffer_refs_(0) {}

/// Flush the file ref
void FileSystemBuffer::FileRef::FlushFrame(FileSystemBuffer::BufferFrame& frame,
                                           std::unique_lock<std::mutex>& dir_guard) {
    assert(!std::holds_alternative<std::monostate>(file_guard_) && "FlushFrame requires file to be locked");

    if (!frame.is_dirty) return;
    auto file_id = ::GetFileID(frame.frame_id);
    auto page_id = ::GetPageID(frame.frame_id);
    auto page_size = buffer_.GetPageSize();

    // Dump frame bytes
    DEBUG_DUMP_BYTES(frame.GetData());

    // Register as user to safely release the directory latch.
    // Lock frame as shared during flushing.
    ++frame.num_users;
    dir_guard.unlock();
    std::shared_lock<std::shared_mutex> frame_guard{frame.frame_latch};

    // Write the file
    if (frame.is_dirty) {
        buffer_.filesystem->Write(*file_->handle, frame.buffer.get(), frame.data_size, page_id * page_size);
        frame.is_dirty = false;
    }

    // Unlock frame to acquire latch
    frame_guard.unlock();
    dir_guard.lock();
    --frame.num_users;
}

/// Load a frame
void FileSystemBuffer::FileRef::LoadFrame(FileSystemBuffer::BufferFrame& frame,
                                          std::unique_lock<std::mutex>& dir_guard) {
    assert(!std::holds_alternative<std::monostate>(file_guard_) && "LoadFrame requires file to be locked");
    assert(frame.frame_state == FileSystemBuffer::BufferFrame::LOADING);
    auto file_id = ::GetFileID(frame.frame_id);
    auto page_id = ::GetPageID(frame.frame_id);
    auto page_size = buffer_.GetPageSize();

    // Determine the actual size of the frame
    frame.data_size = std::min<uint64_t>(file_->file_size - page_id * page_size, buffer_.GetPageSize());
    frame.is_dirty = false;

    // Read data into frame
    assert(frame.data_size <= buffer_.GetPageSize());
    dir_guard.unlock();
    buffer_.filesystem->Read(*file_->handle, frame.buffer.get(), frame.data_size, page_id * page_size);
    dir_guard.lock();

    // Register as loaded
    frame.frame_state = FileSystemBuffer::BufferFrame::LOADED;
    frame.is_dirty = false;
}

void FileSystemBuffer::FileRef::Release() {
    // Already released?
    if (!file_) return;
    auto file = file_;
    file_ = nullptr;

    // Protect with directory latch
    std::unique_lock<std::mutex> dir_guard{buffer_.directory_latch};

    // Test assertions
    assert(std::holds_alternative<std::monostate>(file_guard_) && "Release requires file to be unlocked");
    assert(buffer_refs_ == 0 && "Released FileRef cannot be referenced by buffer frames");
    assert(file->num_users > 0 && "File must store own reference");

    // Is the file referenced by someone else?
    if (file->GetReferenceCount() > 1) return;
    // Have to release the file, acquire exclusive file lock
    dir_guard.unlock();
    std::unique_lock<std::shared_mutex> file_guard{file->file_latch};
    dir_guard.lock();
    // Someone opened the file in the meantime?
    if (file->GetReferenceCount() > 1) return;

    // Flush all file frames
    auto file_id = file->file_id;
    auto lb = buffer_.frames.lower_bound(BuildFrameID(file_id));
    auto ub = buffer_.frames.lower_bound(BuildFrameID(file_id + 1));
    auto it = lb;
    while (it != ub && it != buffer_.frames.end() && ::GetFileID(it->first) == file_id) {
        auto next = it++;
        FlushFrame(next->second, dir_guard);
        // The number of users MUST be 0.
        // We hold an exclusive lock on the file and there is nobody referencing it.
        // => There's no way someone can see the frame
        assert(it->second.num_users == 0);
        if (next->second.lru_position != buffer_.lru.end()) {
            buffer_.lru.erase(next->second.lru_position);
        } else if (next->second.fifo_position != buffer_.fifo.end()) {
            buffer_.fifo.erase(next->second.fifo_position);
        }
        buffer_.frames.erase(next);
    }
    // Erase file
    buffer_.files_by_path.erase(file->path);
    buffer_.free_file_ids.push(file->file_id);
    buffer_.files.erase(file->file_id);
}

void FileSystemBuffer::FileRef::Flush() {
    assert(!std::holds_alternative<std::monostate>(file_guard_) && "LoadFrame requires file to be locked");
    std::unique_lock<std::mutex> dir_guard{buffer_.directory_latch};

    // Flush all frames.
    // Resolve the next iterator before flushing a frame since we might release the directory latch.
    auto file_id = file_->file_id;
    auto lb = buffer_.frames.find(BuildFrameID(file_id));
    auto ub = buffer_.frames.find(BuildFrameID(file_id + 1));
    auto it = lb;
    while (it != ub && it != buffer_.frames.end() && ::GetFileID(it->first) != file_id) {
        auto next = it++;
        FlushFrame(next->second, dir_guard);
    }
}

/// Constructor
FileSystemBuffer::FileSystemBuffer(std::shared_ptr<duckdb::FileSystem> filesystem, uint64_t page_capacity,
                                   uint64_t page_size_bits)
    : page_size_bits(page_size_bits), page_capacity(page_capacity), filesystem(std::move(filesystem)) {}

/// Destructor
FileSystemBuffer::~FileSystemBuffer() { Flush(); }

std::shared_ptr<FileSystemBuffer::FileRef> FileSystemBuffer::OpenFile(std::string_view path,
                                                                      std::unique_ptr<duckdb::FileHandle> handle) {
    // Secure directory access
    std::unique_lock dir_guard{directory_latch};
    // Already added?
    if (auto it = files_by_path.find(path); it != files_by_path.end()) {
        return std::make_shared<FileRef>(*this, *files.at(it->second));
    }
    // Allocate file id
    uint16_t file_id;
    if (!free_file_ids.empty()) {
        file_id = free_file_ids.top();
        free_file_ids.pop();
    } else {
        // File id overflow?
        if (allocated_file_ids == std::numeric_limits<uint16_t>::max()) {
            // XXX User wants to open more than 65535 files at the same time.
            //     We don't support that.
            throw std::runtime_error("cannot open more than 65535 files");
        }
        file_id = allocated_file_ids++;
    }
    // Create file
    auto file_ptr = std::make_unique<BufferedFile>(file_id, path, std::move(handle));
    auto& file = *file_ptr;
    files.insert({file_id, std::move(file_ptr)});
    files_by_path.insert({file.path, file_id});
    if (!file.handle) {
        file.handle = filesystem->OpenFile(
            file.path.c_str(), duckdb::FileFlags::FILE_FLAGS_WRITE | duckdb::FileFlags::FILE_FLAGS_FILE_CREATE);
    }
    file.file_size = filesystem->GetFileSize(*file.handle);
    return std::make_shared<FileRef>(*this, file);
}

std::unique_ptr<char[]> FileSystemBuffer::EvictAnyBufferFrame(std::unique_lock<std::mutex>& dir_guard) {
    FileSystemBuffer::BufferFrame* frame = nullptr;
    FileGuard file_guard;
    while (true) {
        // Find a frame to evict
        auto [frame_,
              file_guard_] = [&]() -> std::pair<FileSystemBuffer::BufferFrame*, std::shared_lock<std::shared_mutex>> {
            // Try FIFO list first
            for (auto* frame : fifo) {
                if (frame->num_users == 0 && frame->frame_state == FileSystemBuffer::BufferFrame::State::LOADED) {
                    std::shared_lock<std::shared_mutex> file_guard{frame->file.file_latch, std::defer_lock};
                    if (file_guard.try_lock()) {
                        return {frame, std::move(file_guard)};
                    }
                }
            }
            // If FIFO list is empty or all pages in it are in use, try LRU
            for (auto* frame : lru) {
                if (frame->num_users == 0 && frame->frame_state == FileSystemBuffer::BufferFrame::State::LOADED) {
                    std::shared_lock<std::shared_mutex> file_guard{frame->file.file_latch, std::defer_lock};
                    if (file_guard.try_lock()) {
                        return {frame, std::move(file_guard)};
                    }
                }
            }
            return {nullptr, std::shared_lock<std::shared_mutex>{}};
        }();
        if (!frame_) return nullptr;
        frame = std::move(frame_);
        file_guard = std::move(file_guard_);

        // Found a loaded page?
        // Try to evicit it.
        assert(frame->frame_state == FileSystemBuffer::BufferFrame::State::LOADED);
        frame->frame_state = FileSystemBuffer::BufferFrame::State::EVICTING;
        if (!frame->is_dirty) break;

        // Flush the frame
        ++frame->num_users;
        dir_guard.unlock();
        FlushFrame(*frame, dir_guard, file_guard);
        dir_guard.lock();

        // Check if someone started using the page while we were flushing
        if (--frame->num_users > 0) continue;

        // Frame must either be evicting or reloaded
        assert(frame->frame_state == FileSystemBuffer::BufferFrame::State::EVICTING ||
               frame->frame_state == FileSystemBuffer::BufferFrame::State::RELOADED);
        if (frame->frame_state == FileSystemBuffer::BufferFrame::State::EVICTING) {
            // Nobody claimed the page while we were evicting it.
            // Otherwise we'd have to retry.
            break;
        }

        // Mark as loaded again and retry
        frame->frame_state = FileSystemBuffer::BufferFrame::LOADED;
    }

    // Erase from queues
    if (frame->lru_position != lru.end()) {
        lru.erase(frame->lru_position);
    } else if (frame->fifo_position != fifo.end()) {
        fifo.erase(frame->fifo_position);
    }
    // Erase from dictionary
    auto buffer = std::move(frame->buffer);
    frames.erase(frame->frame_id);
    return buffer;
}

std::unique_ptr<char[]> FileSystemBuffer::AllocateFrameBuffer(std::unique_lock<std::mutex>& dir_guard) {
    std::unique_ptr<char[]> buffer = nullptr;
    while (frames.size() >= page_capacity) {
        auto evicted = EvictAnyBufferFrame(dir_guard);
        if (!evicted) break;
        buffer = std::move(evicted);
    }
    if (!buffer) {
        buffer = std::unique_ptr<char[]>{new char[GetPageSize()]};
    }
    return buffer;
}

/// Unfix a page
void FileSystemBuffer::FileRef::Unfix(BufferRef&& buffer, bool is_dirty) {
    // Decrease user cound and mark as dirty with directory latch
    std::unique_lock<std::mutex> dir_guard{buffer_.directory_latch};
    buffer.frame_->is_dirty = buffer.frame_->is_dirty || is_dirty;
    --buffer.frame_->num_users;

    // Release a frame lock
    std::visit([](auto&& frame) { frame.release(); }, buffer.frame_guard_);
}

/// Fix a page
FileSystemBuffer::BufferRef FileSystemBuffer::FileRef::FixPage(uint64_t page_id, bool exclusive) {
    // Protect directory access
    std::unique_lock dir_guard{buffer_.directory_latch};

    // Build the frame id
    auto file_id = file_->file_id;
    auto frame_id = BuildFrameID(file_id, page_id);

    // Repeat until we suceed or fail.
    // We might have to wait for a thread that concurrently tries to fix our page.
    // If that thread fails, we try again until we're the one failing.
    std::unique_ptr<char[]> buffer;
    while (true) {
        // Does the frame exist already?
        if (auto it = buffer_.frames.find(frame_id); it != buffer_.frames.end()) {
            // Increase number of users to prevent eviction when releasing the directory latch.
            auto& frame = it->second;
            ++frame.num_users;

            // Is currently being loaded by another thread?
            // This might happen when multiple threads fix the same page concurrently.
            if (frame.frame_state == FileSystemBuffer::BufferFrame::NEW) {
                // Wait for other thread to finish.
                // We acquire the frame latch exclusively to block on the loading.
                dir_guard.unlock();
                frame.frame_latch.lock();
                frame.frame_latch.unlock();
                dir_guard.lock();

                // Other thread failed to allocate a buffer for the frame?
                if (frame.frame_state == FileSystemBuffer::BufferFrame::State::NEW) {
                    // Give up on that frame
                    --frame.num_users;
                    if (frame.num_users == 0) {
                        assert(frame.fifo_position == buffer_.fifo.end() && frame.lru_position == buffer_.lru.end());
                        buffer_.frames.erase(it);
                    }

                    // Try again until we're the one that fails
                    continue;
                }
            }

            /// Is someone currently evicting the page?
            else if (frame.frame_state == FileSystemBuffer::BufferFrame::State::EVICTING) {
                frame.frame_state = FileSystemBuffer::BufferFrame::State::RELOADED;
            }

            // Is page in LRU queue?
            if (frame.lru_position != buffer_.lru.end()) {
                // Update the queue and move it to the end.
                buffer_.lru.erase(frame.lru_position);
                frame.lru_position = buffer_.lru.insert(buffer_.lru.end(), &frame);
            } else {
                // Page was in FIFO queue and was fixed again, move it to LRU
                assert(frame.fifo_position != buffer_.fifo.end());
                buffer_.fifo.erase(frame.fifo_position);
                frame.fifo_position = buffer_.fifo.end();
                frame.lru_position = buffer_.lru.insert(buffer_.lru.end(), &frame);
            }

            // Release directory latch and lock frame
            dir_guard.unlock();
            FrameGuard frame_guard;
            if (exclusive) {
                frame_guard = frame.Lock(Exclusive);
            } else {
                frame_guard = frame.Lock(Shared);
            }
            return BufferRef{shared_from_this(), frame, std::move(frame_guard)};
        }

        // Allocate a buffer frame.
        // Note that this will always succeed since we're (over-)allocating a new buffer if necessary.
        buffer = buffer_.AllocateFrameBuffer(dir_guard);

        // Someone allocated the frame while we were allocating a buffer frame?
        if (auto it = buffer_.frames.find(frame_id); it != buffer_.frames.end()) continue;
        break;
    }

    // Create a new frame but don't insert it in the queues, yet.
    assert(buffer_.frames.find(frame_id) == buffer_.frames.end());
    auto [it, ok] =
        buffer_.frames.emplace(std::piecewise_construct, std::forward_as_tuple(frame_id),
                               std::forward_as_tuple(*file_, frame_id, buffer_.fifo.end(), buffer_.lru.end()));
    assert(ok);
    auto& frame = it->second;

    // Lock the frame exclusively to secure the loading.
    // We might release the latch while allocating a buffer frame and other threads might see the new frame.
    // I.e. see earlier condition.
    ++frame.num_users;
    FrameGuard frame_guard{std::unique_lock<std::shared_mutex>{frame.frame_latch}};

    // Load the data into the frame
    frame.frame_state = FileSystemBuffer::BufferFrame::State::LOADING;
    frame.buffer = std::move(buffer);
    frame.fifo_position = buffer_.fifo.insert(buffer_.fifo.end(), &frame);
    LoadFrame(frame, dir_guard);

    // Downgrade the lock (if necessary)
    if (!exclusive) {
        std::get<std::unique_lock<std::shared_mutex>>(frame_guard).unlock();
        dir_guard.unlock();
        frame_guard = std::shared_lock<std::shared_mutex>{frame.frame_latch};
    } else {
        dir_guard.unlock();
    }
    return BufferRef{shared_from_this(), frame, std::move(frame_guard)};
}

uint64_t FileSystemBuffer::FileRef::Read(void* out, uint64_t n, duckdb::idx_t offset) {
    // Check upper file boundary first
    auto read_end = std::min<uint64_t>(file_->file_size, offset + n);
    auto read_max = std::min<uint64_t>(n, std::max<uint64_t>(read_end, offset) - offset);
    if (read_max == 0) return 0;

    // Determine page & offset
    auto page_id = offset >> buffer_.GetPageSizeShift();
    auto skip_here = offset - page_id * buffer_.GetPageSize();
    auto read_here = std::min<uint64_t>(read_max, buffer_.GetPageSize() - skip_here);

    // Fix page
    auto page = FixPage(page_id, false);

    // Copy page data to buffer
    auto data = page.GetData();
    read_here = std::min<uint64_t>(read_here, data.size());
    std::memcpy(static_cast<char*>(out), data.data() + skip_here, read_here);
    return read_here;
}

uint64_t FileSystemBuffer::FileRef::Write(const void* in, uint64_t bytes, duckdb::idx_t offset) {
    // Determine page & offset
    auto page_id = offset >> buffer_.GetPageSizeShift();
    auto skip_here = offset - page_id * buffer_.GetPageSize();
    auto write_here = std::min<uint64_t>(bytes, buffer_.GetPageSize() - skip_here);

    // Fix page
    auto page = FixPage(page_id, true);
    write_here = std::min<uint64_t>(write_here, buffer_.GetPageSize());

    // Copy data to page
    auto data = page.GetData();
    std::memcpy(data.data() + skip_here, static_cast<const char*>(in), write_here);
    page.MarkAsDirty();
    return write_here;
}

void FileSystemBuffer::FlushFile(std::string_view path) {
    // We need to find the file first
    std::unique_lock dir_guard{directory_latch};
    FileRef file_ref{*this};
    if (auto it = files_by_path.find(path); it != files_by_path.end()) {
        file_ref.file_ = files.at(it->second).get();
    } else {
        return;
    }
    dir_guard.unlock();

    // Flush the file
    file_ref.file_guard_ = std::unique_lock<std::shared_mutex>();
    file_ref.Flush();
}

void FileSystemBuffer::Flush() {
    // Collect files
    std::unique_lock<std::mutex> dir_guard{directory_latch};
    std::vector<FileRef> file_refs;
    for (auto& [file_id, file] : files) {
        file_refs.emplace_back(*this, *file);
    }
    dir_guard.unlock();

    // Flush files
    for (auto& file_ref : file_refs) {
        auto file_latch = file_ref.file_->Lock(Exclusive);
        file_ref.Flush();
    }
}

/// Release a file
void FileSystemBuffer::ReleaseFile(BufferedFile& file, std::unique_lock<std::mutex>& dir_guard, FileGuard file_guard) {
    // Someone opened the file in the meantime?
    if (file.GetReferenceCount() > 1) return;

    // Flush all file frames
    auto file_id = file.file_id;
    auto lb = frames.lower_bound(BuildFrameID(file_id));
    auto ub = frames.lower_bound(BuildFrameID(file_id + 1));
    auto it = lb;
    while (it != ub && it != frames.end() && ::GetFileID(it->first) == file_id) {
        auto next = it++;
        FlushFrame(next->second, dir_guard, file_guard);
        // The number of users MUST be 0.
        // We hold an exclusive lock on the file and there is nobody referencing it.
        // => There's no way someone can see the frame
        assert(it->second.num_users == 0);
        if (next->second.lru_position != lru.end()) {
            lru.erase(next->second.lru_position);
        } else if (next->second.fifo_position != fifo.end()) {
            fifo.erase(next->second.fifo_position);
        }
        frames.erase(next);
    }
    // Erase file
    files_by_path.erase(file.path);
    free_file_ids.push(file.file_id);
    files.erase(file.file_id);
}

void FileSystemBuffer::FileRef::Truncate(uint64_t new_size) {
    // Modify file file.
    // This will lock out ALL file users.
    auto* file = file_;
    auto file_lock = file->Lock(Exclusive);

    // Block all file accesses
    if (file->file_size != new_size) {
        buffer_.filesystem->Truncate(*file->handle, new_size);
        file->file_size = new_size;
    }

    // Update all file frames
    std::unique_lock<std::mutex> dir_guard{buffer_.directory_latch};
    auto file_id = file_->file_id;
    auto lb = buffer_.frames.lower_bound(BuildFrameID(file_id));
    auto ub = buffer_.frames.lower_bound(BuildFrameID(file_id + 1));
    for (auto it = lb; it != ub; ++it) {
        auto& frame = it->second;
        auto page_id = GetPageID(frame.frame_id);
        auto page_begin = page_id * buffer_.GetPageSize();
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
