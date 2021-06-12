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

#include "duckdb/web/scope_guard.h"

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
    file.frames.insert(file.frames.begin(), this);
    file_frame_position = file.frames.begin();
}

/// Constructor
FileSystemBuffer::BufferRef::BufferRef(FileRef& file, SharedFileGuard&& file_guard, BufferFrame& frame,
                                       FrameGuardVariant frame_guard)
    : file_(&file), file_guard_(std::move(file_guard)), frame_(&frame), frame_guard_(std::move(frame_guard)) {}

/// Mark a buffer ref as dirty
void FileSystemBuffer::BufferRef::MarkAsDirty() {
    auto dir_guard = file_->buffer_.Lock();
    frame_->is_dirty = true;
}
/// Release a buffer ref
void FileSystemBuffer::BufferRef::Release() {
    if (!frame_) return;
    // Decrease user count and mark as dirty with directory latch.
    // Destructor will then release the frame guard variant.
    auto dir_guard = file_->buffer_.Lock();
    assert(frame_->num_users > 0);
    --frame_->num_users;
    frame_ = nullptr;
    // Unlock frame guard with directory latch
    std::visit([&](auto& l) { l.unlock(); }, frame_guard_);
}

/// Constructor
FileSystemBuffer::FileRef::FileRef(FileSystemBuffer& buffer) : buffer_(buffer), file_(nullptr) {}

/// Flush the file ref
void FileSystemBuffer::FileRef::FlushFrameUnsafe(FileSystemBuffer::BufferFrame& frame, DirectoryGuard& dir_guard) {
    buffer_.FlushFrameUnsafe(frame, dir_guard);
}

/// Load a frame
void FileSystemBuffer::FileRef::LoadFrameUnsafe(FileSystemBuffer::BufferFrame& frame, DirectoryGuard& dir_guard) {
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
    // Protect with directory latch
    auto dir_guard = buffer_.Lock();
    // Clear file pointer eventually
    auto release_file = sg::make_scope_guard([&]() { file_ = nullptr; });

    // Is the file referenced by someone else?
    assert(file_->GetReferenceCount() > 0 && "File must store own reference");
    if (file_->GetReferenceCount() > 1) {
        --file_->num_users;
        return;
    }

    // We have to release the file, acquire exclusive file lock
    dir_guard.unlock();
    auto file_guard = Lock(Exclusive);
    dir_guard.lock();

    // Someone opened the file in the meantime?
    if (file_->GetReferenceCount() > 1) {
        --file_->num_users;
        return;
    }
    // Flush all file frames
    for (auto iter = file_->frames.begin(); iter != file_->frames.end();) {
        auto& frame = **iter;

        // Flush the frame
        FlushFrameUnsafe(frame, dir_guard);
        // The number of users MUST be 0.
        // We hold an exclusive lock on the file and there is nobody referencing it.
        // => There's no way someone can see the frame
        assert(frame.GetUserCount() == 0);
        if (frame.lru_position != buffer_.lru.end()) {
            buffer_.lru.erase(frame.lru_position);
        } else if (frame.fifo_position != buffer_.fifo.end()) {
            buffer_.fifo.erase(frame.fifo_position);
        }
        // Erase the frame
        auto next = ++iter;
        buffer_.frames.erase(frame.frame_id);
        iter = next;
    }

    // Decrement user counter, likely to zero
    assert(file_->GetReferenceCount() > 0 && "File must store own reference");
    --file_->num_users;

    // Someone opened the file in the meantime?
    if (file_->GetReferenceCount() > 0) {
        return;
    }

    // Erase file
    buffer_.files_by_path.erase(file_->path);
    buffer_.free_file_ids.push(file_->file_id);
    buffer_.files.erase(file_->file_id);
}

/// Flush file with guard
void FileSystemBuffer::FileRef::Flush() {
    auto file_guard = Lock(Shared);
    FlushUnsafe();
}

/// Flush file without guard
void FileSystemBuffer::FileRef::FlushUnsafe() {
    // Flush all frames.
    auto dir_guard = buffer_.Lock();
    for (auto iter = file_->frames.begin(); iter != file_->frames.end(); ++iter) {
        FlushFrameUnsafe(**iter, dir_guard);
    }
}

/// Constructor
FileSystemBuffer::FileSystemBuffer(std::shared_ptr<duckdb::FileSystem> filesystem, uint64_t page_capacity,
                                   uint64_t page_size_bits)
    : page_size_bits(page_size_bits), page_capacity(page_capacity), filesystem(std::move(filesystem)) {}

/// Destructor
FileSystemBuffer::~FileSystemBuffer() { Flush(); }

std::unique_ptr<FileSystemBuffer::FileRef> FileSystemBuffer::OpenFile(std::string_view path,
                                                                      std::unique_ptr<duckdb::FileHandle> handle) {
    auto dir_guard = Lock();
    // Already added?
    if (auto it = files_by_path.find(path); it != files_by_path.end()) {
        return std::make_unique<FileRef>(*this, *files.at(it->second));
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
    return std::make_unique<FileRef>(*this, file);
}

std::unique_ptr<char[]> FileSystemBuffer::EvictAnyBufferFrame(DirectoryGuard& dir_guard) {
    FileSystemBuffer::BufferFrame* frame = nullptr;
    std::shared_lock<std::shared_mutex> file_guard;
    while (true) {
        // Find a frame to evict
        auto [frame_,
              file_guard_] = [&]() -> std::pair<FileSystemBuffer::BufferFrame*, std::shared_lock<std::shared_mutex>> {
            // Try FIFO list first
            for (auto* frame : fifo) {
                if (frame->GetUserCount() == 0 && frame->frame_state == FileSystemBuffer::BufferFrame::State::LOADED) {
                    std::shared_lock<std::shared_mutex> file_guard{frame->file.file_latch, std::defer_lock};
                    if (file_guard.try_lock()) {
                        return {frame, std::move(file_guard)};
                    }
                }
            }
            // If FIFO list is empty or all pages in it are in use, try LRU
            for (auto* frame : lru) {
                if (frame->GetUserCount() == 0 && frame->frame_state == FileSystemBuffer::BufferFrame::State::LOADED) {
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
        FlushFrameUnsafe(*frame, dir_guard);

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

std::unique_ptr<char[]> FileSystemBuffer::AllocateFrameBuffer(DirectoryGuard& dir_guard) {
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

/// Fix a page
FileSystemBuffer::BufferRef FileSystemBuffer::FileRef::FixPage(uint64_t page_id, bool exclusive) {
    assert(file_ != nullptr);
    auto file_guard = Lock(Shared);
    auto dir_guard = buffer_.Lock();
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
            ++frame->num_users;

            // Is currently being loaded by another thread?
            // This might happen when multiple threads fix the same page concurrently.
            if (frame->frame_state == FileSystemBuffer::BufferFrame::NEW) {
                // Wait for other thread to finish.
                // We acquire the frame latch exclusively to block on the loading.
                dir_guard.unlock();
                frame->Lock(Exclusive).unlock();
                dir_guard.lock();

                // Other thread failed to allocate a buffer for the frame?
                if (frame->frame_state == FileSystemBuffer::BufferFrame::State::NEW) {
                    // Give up on that frame
                    --frame->num_users;
                    if (frame->GetUserCount() == 0) {
                        assert(frame->fifo_position == buffer_.fifo.end() && frame->lru_position == buffer_.lru.end());
                        buffer_.frames.erase(it);
                    }

                    // Try again until we're the one that fails
                    continue;
                }
            }

            /// Is someone currently evicting the page?
            else if (frame->frame_state == FileSystemBuffer::BufferFrame::State::EVICTING) {
                frame->frame_state = FileSystemBuffer::BufferFrame::State::RELOADED;
            }

            // Is page in LRU queue?
            if (frame->lru_position != buffer_.lru.end()) {
                // Update the queue and move it to the end.
                buffer_.lru.erase(frame->lru_position);
                frame->lru_position = buffer_.lru.insert(buffer_.lru.end(), frame.get());
            } else {
                // Page was in FIFO queue and was fixed again, move it to LRU
                assert(frame->fifo_position != buffer_.fifo.end());
                buffer_.fifo.erase(frame->fifo_position);
                frame->fifo_position = buffer_.fifo.end();
                frame->lru_position = buffer_.lru.insert(buffer_.lru.end(), frame.get());
            }

            // Release directory latch and lock frame
            dir_guard.unlock();
            FrameGuardVariant frame_guard;
            if (exclusive) {
                frame_guard = frame->Lock(Exclusive);
            } else {
                frame_guard = frame->Lock(Shared);
            }
            return BufferRef{*this, std::move(file_guard), *frame, std::move(frame_guard)};
        }

        // Allocate a buffer frame.
        // Note that this will always succeed since we're (over-)allocating a new buffer if necessary.
        buffer = buffer_.AllocateFrameBuffer(dir_guard);
        assert(dir_guard.owns_lock());

        // Someone allocated the frame while we were allocating a buffer frame?
        if (auto it = buffer_.frames.find(frame_id); it != buffer_.frames.end()) continue;
        break;
    }

    // Create a new frame.
    assert(dir_guard.owns_lock());
    assert(buffer_.frames.find(frame_id) == buffer_.frames.end());
    auto frame_ptr = std::make_unique<BufferFrame>(*file_, frame_id, buffer_.fifo.end(), buffer_.lru.end());
    auto& frame = *frame_ptr;
    frame.frame_state = FileSystemBuffer::BufferFrame::State::LOADING;
    frame.buffer = std::move(buffer);
    ++frame.num_users;

    // Lock the frame exclusively to secure the loading.
    // We might release the latch while allocating a buffer frame and other threads might see the new frame.
    assert(frame.num_users == 1);
    FrameGuardVariant frame_guard = frame.Lock(Exclusive);

    // Insert into frames and queue
    frame.fifo_position = buffer_.fifo.insert(buffer_.fifo.end(), &frame);
    buffer_.frames.insert({frame_id, std::move(frame_ptr)});

    // Load the data into the frame
    LoadFrameUnsafe(frame, dir_guard);
    assert(dir_guard.owns_lock());

    // Downgrade the lock (if necessary)
    if (!exclusive) {
        std::get<std::unique_lock<std::shared_mutex>>(frame_guard).unlock();
        dir_guard.unlock();
        frame_guard = frame.Lock(Shared);
    } else {
        dir_guard.unlock();
    }
    return BufferRef{*this, std::move(file_guard), frame, std::move(frame_guard)};
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

/// Flush a file at a path.
void FileSystemBuffer::FlushFile(std::string_view path) {
    // We need to find the file first
    auto dir_guard = Lock();
    auto file_ref = std::make_shared<FileRef>(*this);
    if (auto it = files_by_path.find(path); it != files_by_path.end()) {
        file_ref->file_ = files.at(it->second).get();
    } else {
        return;
    }
    dir_guard.unlock();

    // Flush the file
    file_ref->Lock(Shared);
    file_ref->FlushUnsafe();
}

/// Flush all files in the buffer
void FileSystemBuffer::Flush() {
    // Collect files
    auto dir_guard = Lock();
    std::vector<std::shared_ptr<FileRef>> file_refs;
    for (auto& [file_id, file] : files) {
        file_refs.push_back(std::make_shared<FileRef>(*this, *file));
    }
    dir_guard.unlock();

    // Flush files
    for (auto& file_ref : file_refs) {
        file_ref->Flush();
    }
}

/// Flush a frame
void FileSystemBuffer::FlushFrame(BufferFrame& frame, DirectoryGuard& dir_guard, UniqueFileGuard& file_guard) {
    FlushFrameUnsafe(frame, dir_guard);
}

/// Flush a frame
void FileSystemBuffer::FlushFrame(BufferFrame& frame, DirectoryGuard& dir_guard, SharedFileGuard& file_guard) {
    FlushFrameUnsafe(frame, dir_guard);
}

/// Flush a frame.
/// Assumes that the file of the frame is under control.
void FileSystemBuffer::FlushFrameUnsafe(BufferFrame& frame, DirectoryGuard& dir_guard) {
    if (!frame.is_dirty) return;
    auto& file = frame.file;
    auto file_id = GetFileID(frame.frame_id);
    auto page_id = GetPageID(frame.frame_id);
    auto page_size = GetPageSize();

    // Dump frame bytes
    DEBUG_DUMP_BYTES(frame.GetData());

    // Register as user to safely release the directory latch.
    // Lock frame as shared during flushing.
    ++frame.num_users;
    dir_guard.unlock();
    auto frame_guard = frame.Lock(Shared);

    // Write the file
    if (frame.is_dirty) {
        filesystem->Write(*file.handle, frame.buffer.get(), frame.data_size, page_id * page_size);
        frame.is_dirty = false;
    }

    // Unlock frame to acquire latch
    frame_guard.unlock();
    dir_guard.lock();
    --frame.num_users;
}

/// Release a file
void FileSystemBuffer::ReleaseFile(BufferedFile& file, DirectoryGuard& dir_guard, UniqueFileGuard&& file_guard) {
    ReleaseFileUnsafe(file, dir_guard);
}

/// Release a file
void FileSystemBuffer::ReleaseFile(BufferedFile& file, DirectoryGuard& dir_guard, SharedFileGuard&& file_guard) {
    ReleaseFileUnsafe(file, dir_guard);
}

/// Release a file
void FileSystemBuffer::ReleaseFileUnsafe(BufferedFile& file, DirectoryGuard& dir_guard) {
    // Someone opened the file in the meantime?
    if (file.GetReferenceCount() > 1) return;

    // Flush all file frames
    for (auto iter = file.frames.begin(); iter != file.frames.end(); ++iter) {
        auto& frame = **iter;

        // Flush frame
        FlushFrameUnsafe(frame, dir_guard);

        // The number of users MUST be 0.
        // We hold an exclusive lock on the file and there is nobody referencing it.
        // => There's no way someone can see the frame
        assert(frame.GetUserCount() == 0);
        if (frame.lru_position != lru.end()) {
            lru.erase(frame.lru_position);
        } else if (frame.fifo_position != fifo.end()) {
            fifo.erase(frame.fifo_position);
        }

        // Erase frame
        frames.erase(frame.frame_id);
    }
    // Erase file
    files_by_path.erase(file.path);
    free_file_ids.push(file.file_id);
    files.erase(file.file_id);
}

/// Truncate a file
void FileSystemBuffer::FileRef::Truncate(uint64_t new_size) {
    // Modify file file.
    // This will lock out ALL file users.
    auto* file = file_;
    auto file_lock = Lock(Exclusive);

    // Block all file accesses
    if (file->file_size != new_size) {
        buffer_.filesystem->Truncate(*file->handle, new_size);
        file->file_size = new_size;
    }

    // Update all file frames
    auto dir_guard = buffer_.Lock();
    for (auto iter = file_->frames.begin(); iter != file_->frames.end(); ++iter) {
        auto& frame = **iter;
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
