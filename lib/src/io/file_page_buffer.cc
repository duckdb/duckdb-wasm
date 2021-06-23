#include "duckdb/web/io/file_page_buffer.h"

#include <cassert>
#include <cstdint>
#include <cstring>
#include <duckdb/common/exception.hpp>
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

#include "duckdb/web/debug.h"
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
FilePageBuffer::BufferFrame::BufferFrame(BufferedFile& file, uint64_t frame_id, list_position fifo_position,
                                         list_position lru_position)
    : file(file), frame_id(frame_id), fifo_position(fifo_position), lru_position(lru_position), frame_latch() {
    file.frames.insert(file.frames.begin(), this);
    file_frame_position = file.frames.begin();
}

/// Constructor
FilePageBuffer::BufferRef::BufferRef(FileRef& file, SharedFileGuard&& file_guard, BufferFrame& frame,
                                     FrameGuardVariant frame_guard)
    : file_(&file), file_guard_(std::move(file_guard)), frame_(&frame), frame_guard_(std::move(frame_guard)) {}

/// Mark a buffer ref as dirty
void FilePageBuffer::BufferRef::MarkAsDirty() {
    if ((file_->file_->file_flags & duckdb::FileFlags::FILE_FLAGS_WRITE) == 0) {
        throw std::runtime_error("File is not opened in write mode");
    }
    auto dir_guard = file_->buffer_.Lock();
    frame_->is_dirty = true;
}
/// Release a buffer ref
void FilePageBuffer::BufferRef::Release() {
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
FilePageBuffer::FileRef::FileRef(FilePageBuffer& buffer) : buffer_(buffer), file_(nullptr) {}

/// Load a frame
void FilePageBuffer::FileRef::LoadFrame(FilePageBuffer::BufferFrame& frame, FileGuardRefVariant file_guard,
                                        DirectoryGuard& dir_guard) {
    DEBUG_TRACE();
    assert(frame.frame_state == FilePageBuffer::BufferFrame::LOADING);
    auto file_id = ::GetFileID(frame.frame_id);
    auto page_id = ::GetPageID(frame.frame_id);
    auto page_size = buffer_.GetPageSize();

    // Determine the actual size of the frame
    frame.data_size = std::min<uint64_t>(file_->file_size - page_id * page_size, buffer_.GetPageSize());
    frame.is_dirty = false;

    // Read data into frame
    assert(frame.data_size <= buffer_.GetPageSize());
    dir_guard.unlock();
    buffer_.filesystem->Read(GetHandle(), frame.buffer.get(), frame.data_size, page_id * page_size);
    dir_guard.lock();

    // Register as loaded
    frame.frame_state = FilePageBuffer::BufferFrame::LOADED;
    frame.is_dirty = false;
}

void FilePageBuffer::FileRef::Release() {
    DEBUG_TRACE();
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
        buffer_.FlushFrame(frame, file_guard, dir_guard);
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
    auto iter = buffer_.files.find(file_->file_id);
    auto tmp = std::move(iter->second);
    buffer_.files.erase(iter);
    file_guard.unlock();
}

/// Flush file with guard
void FilePageBuffer::FileRef::Flush() {
    auto file_guard = Lock(Shared);
    Flush(file_guard);
}

/// Flush file without guard
void FilePageBuffer::FileRef::Flush(FileGuardRefVariant file_guard) {
    // Flush all frames.
    auto dir_guard = buffer_.Lock();
    for (auto iter = file_->frames.begin(); iter != file_->frames.end(); ++iter) {
        buffer_.FlushFrame(**iter, file_guard, dir_guard);
    }
}

/// Constructor
FilePageBuffer::FilePageBuffer(std::shared_ptr<duckdb::FileSystem> filesystem, uint64_t page_capacity,
                               uint64_t page_size_bits)
    : page_size_bits(page_size_bits), page_capacity(page_capacity), filesystem(std::move(filesystem)) {}

/// Destructor
FilePageBuffer::~FilePageBuffer() { FlushFiles(); }

std::unique_ptr<FilePageBuffer::FileRef> FilePageBuffer::OpenFile(std::string_view path, uint8_t flags,
                                                                  duckdb::FileLockType lock_type) {
    DEBUG_TRACE();
    auto dir_guard = Lock();

    // Already added?
    if (auto it = files_by_path.find(path); it != files_by_path.end()) {
        auto* file = it->second;
        // Is locked exclusively?
        // We only allow one file ref with active WRITE_LOCK.
        // Otherwise we wouldn't know when to release the WRITE_LOCK.
        if (file->file_lock == duckdb::FileLockType::WRITE_LOCK) {
            std::string path_buf{path};
            throw duckdb::IOException("File %s is already locked exclusively", path_buf.c_str());
        }

        // User requested truncation of existing file?
        if (flags == duckdb::FileFlags::FILE_FLAGS_FILE_CREATE_NEW) {
            std::string path_buf{path};
            throw duckdb::IOException(
                "File %s is already opened and cannot be truncated with FILE_FLAGS_FILE_CREATE_NEW", path_buf.c_str());
        }

        // Check if the user wants to write to the file
        bool wants_writeable = (flags & duckdb::FileFlags::FILE_FLAGS_WRITE) != 0;
        bool is_writeable = (file->file_flags & duckdb::FileFlags::FILE_FLAGS_WRITE) != 0;

        if (wants_writeable) {
            // Only opened readable before?
            if (!is_writeable) {
                // Reopen as writeable
                auto ref = std::make_unique<FileRef>(*this, *files.at(it->second->file_id));
                dir_guard.unlock();
                ref->ReOpen(flags, lock_type);
                return ref;

            } else {
                // Conflicting APPEND?
                // Either a file is always appending or not.
                bool wants_append = (flags & duckdb::FileFlags::FILE_FLAGS_APPEND) != 0;
                bool is_append = (file->file_flags & duckdb::FileFlags::FILE_FLAGS_APPEND) != 0;
                if (wants_append && !is_append) {
                    std::string path_buf{path};
                    throw duckdb::IOException("File %s is already opened without APPEND", path_buf.c_str());
                }
            }
        }
        return std::make_unique<FileRef>(*this, *files.at(it->second->file_id));
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
    auto file_ptr = std::make_unique<BufferedFile>(file_id, path, flags, lock_type);
    auto& file = *file_ptr;
    file.handle = filesystem->OpenFile(file.path.c_str(), flags);
    files_by_path.insert({file.path, file_ptr.get()});
    files.insert({file_id, std::move(file_ptr)});
    file.file_size = filesystem->GetFileSize(*file.handle);
    return std::make_unique<FileRef>(*this, file);
}

std::unique_ptr<char[]> FilePageBuffer::EvictAnyBufferFrame(DirectoryGuard& dir_guard) {
    DEBUG_TRACE();
    FilePageBuffer::BufferFrame* frame = nullptr;
    std::shared_lock<std::shared_mutex> file_guard;
    while (true) {
        // Find a frame to evict
        auto [frame_,
              file_guard_] = [&]() -> std::pair<FilePageBuffer::BufferFrame*, std::shared_lock<std::shared_mutex>> {
            // Try FIFO list first
            for (auto* frame : fifo) {
                if (frame->GetUserCount() == 0 && frame->frame_state == FilePageBuffer::BufferFrame::State::LOADED) {
                    std::shared_lock<std::shared_mutex> file_guard{frame->file.file_latch, std::defer_lock};
                    if (file_guard.try_lock()) {
                        return {frame, std::move(file_guard)};
                    }
                }
            }
            // If FIFO list is empty or all pages in it are in use, try LRU
            for (auto* frame : lru) {
                if (frame->GetUserCount() == 0 && frame->frame_state == FilePageBuffer::BufferFrame::State::LOADED) {
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
        assert(frame->frame_state == FilePageBuffer::BufferFrame::State::LOADED);
        frame->frame_state = FilePageBuffer::BufferFrame::State::EVICTING;
        if (!frame->is_dirty) break;

        // Flush the frame
        ++frame->num_users;
        FlushFrame(*frame, file_guard, dir_guard);

        // Check if someone started using the page while we were flushing
        if (--frame->num_users > 0) continue;

        // Frame must either be evicting or reloaded
        assert(frame->frame_state == FilePageBuffer::BufferFrame::State::EVICTING ||
               frame->frame_state == FilePageBuffer::BufferFrame::State::RELOADED);
        if (frame->frame_state == FilePageBuffer::BufferFrame::State::EVICTING) {
            // Nobody claimed the page while we were evicting it.
            // Otherwise we'd have to retry.
            break;
        }

        // Mark as loaded again and retry
        frame->frame_state = FilePageBuffer::BufferFrame::LOADED;
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

std::unique_ptr<char[]> FilePageBuffer::AllocateFrameBuffer(DirectoryGuard& dir_guard) {
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
FilePageBuffer::BufferRef FilePageBuffer::FileRef::FixPage(uint64_t page_id, bool exclusive) {
    DEBUG_TRACE();
    auto file_guard = Lock(Shared);
    auto [frame_ptr, frame_guard] = FixPage(page_id, exclusive, file_guard);
    return BufferRef{*this, std::move(file_guard), *frame_ptr, std::move(frame_guard)};
}

/// Fix a page with existing file lock
std::pair<FilePageBuffer::BufferFrame*, FilePageBuffer::FrameGuardVariant> FilePageBuffer::FileRef::FixPage(
    uint64_t page_id, bool exclusive, FileGuardRefVariant file_guard) {
    DEBUG_TRACE();
    assert(file_ != nullptr);
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
            if (frame->frame_state == FilePageBuffer::BufferFrame::NEW) {
                // Wait for other thread to finish.
                // We acquire the frame latch exclusively to block on the loading.
                dir_guard.unlock();
                frame->Lock(Exclusive).unlock();
                dir_guard.lock();

                // Other thread failed to allocate a buffer for the frame?
                if (frame->frame_state == FilePageBuffer::BufferFrame::State::NEW) {
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
            else if (frame->frame_state == FilePageBuffer::BufferFrame::State::EVICTING) {
                frame->frame_state = FilePageBuffer::BufferFrame::State::RELOADED;
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
            return {frame.get(), std::move(frame_guard)};
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
    frame.frame_state = FilePageBuffer::BufferFrame::State::LOADING;
    frame.buffer = std::move(buffer);
    ++frame.num_users;

    // Lock the frame exclusively to secure the loading.
    // We might release the latch while allocating a buffer frame and other threads might see the new frame.
    assert(frame.num_users == 1);
    FrameGuardVariant frame_guard = frame.Lock(Exclusive);

    // Insert into frames and queue
    frame.fifo_position = buffer_.fifo.insert(buffer_.fifo.end(), &frame);
    buffer_.frames.insert({frame_id, std::move(frame_ptr)});

    // Load the data into the frame (if requested)
    LoadFrame(frame, file_guard, dir_guard);
    assert(dir_guard.owns_lock());

    // Downgrade the lock (if necessary)
    if (!exclusive) {
        std::get<std::unique_lock<std::shared_mutex>>(frame_guard).unlock();
        dir_guard.unlock();
        frame_guard = frame.Lock(Shared);
    } else {
        dir_guard.unlock();
    }
    return {&frame, std::move(frame_guard)};
}

uint64_t FilePageBuffer::FileRef::Read(void* out, uint64_t n, duckdb::idx_t offset) {
    DEBUG_TRACE();
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

uint64_t FilePageBuffer::FileRef::Write(void* in, uint64_t bytes, duckdb::idx_t offset) {
    DEBUG_TRACE();
    auto file_guard = Lock(Shared);

    // Is not opened in WRITE mode?
    if ((file_->file_flags & duckdb::FileFlags::FILE_FLAGS_WRITE) == 0) {
        throw std::runtime_error("File is not opened in write mode");
    }

    // Append to file?
    // Otherwise a write will never write past the end!
    if ((file_->file_flags & duckdb::FileFlags::FILE_FLAGS_APPEND) != 0 || (offset == file_->file_size)) {
        file_guard.unlock();
        auto file_guard = Lock(Exclusive);
        Append(in, bytes, file_guard);
        return bytes;
    }

    // Determine page & offset
    auto page_id = offset >> buffer_.GetPageSizeShift();
    auto skip_here = offset - page_id * buffer_.GetPageSize();
    auto write_here = std::min<uint64_t>(bytes, buffer_.GetPageSize() - skip_here);

    // Fix page
    auto [frame_ptr, frame_guard] = FixPage(page_id, true, file_guard);
    BufferRef page{*this, std::move(file_guard), *frame_ptr, std::move(frame_guard)};
    write_here = std::min<uint64_t>(write_here, buffer_.GetPageSize());

    // Copy data to page
    auto data = page.GetData();
    std::memcpy(data.data() + skip_here, static_cast<const char*>(in), write_here);
    page.MarkAsDirty();
    return write_here;
}

/// Append to the file
void FilePageBuffer::FileRef::Append(void* buffer, uint64_t n) {
    DEBUG_TRACE();
    auto file_guard = Lock(Exclusive);
    Append(buffer, n, file_guard);
}

void FilePageBuffer::FileRef::Append(void* buffer, uint64_t bytes, UniqueFileGuard& file_guard) {
    DEBUG_TRACE();

    // Is not opened in WRITE mode?
    if ((file_->file_flags & duckdb::FileFlags::FILE_FLAGS_WRITE) == 0) {
        throw std::runtime_error("file is not opened in write mode");
    }

    // Write to the end of the file
    auto old_file_size = file_->file_size;
    auto new_file_size = old_file_size + bytes;
    buffer_.filesystem->Seek(GetHandle(), old_file_size);

    // Repeat until depleted
    auto reader = static_cast<char*>(buffer);
    auto remaining = bytes;
    while (remaining > 0) {
        auto n = buffer_.filesystem->Write(GetHandle(), reader, remaining);
        assert(n <= remaining);
        reader += n;
        remaining -= n;
    }
    file_->file_size = new_file_size;

    // Do we need to resize the last page?
    auto page_size = buffer_.GetPageSize();
    auto last_page_id = old_file_size >> buffer_.GetPageSizeShift();
    auto last_page_bytes = old_file_size - (last_page_id << buffer_.GetPageSizeShift());
    auto last_page_capacity = buffer_.GetPageSize() - last_page_bytes;
    auto last_page_frame = BuildFrameID(file_->file_id, last_page_id);

    // Write data into last page if it's loaded
    auto dir_guard = buffer_.Lock();
    auto frame_iter = buffer_.frames.find(last_page_frame);
    if (frame_iter != buffer_.frames.end()) {
        auto write_here = std::min(last_page_capacity, bytes);
        auto frame_ptr = frame_iter->second.get();
        frame_ptr->data_size = last_page_bytes + write_here;
        std::memcpy(frame_ptr->GetData().data() + last_page_bytes, buffer, write_here);
        assert(write_here <= bytes);

        // We do not need to mark the page dirty since we write directly to disk.
        // It might already be dirty in which case it stays dirty.
    }
}

/// Append to the file
void FilePageBuffer::FileRef::ReOpen(uint8_t flags, duckdb::FileLockType lock_type) {
    DEBUG_TRACE();
    auto file_guard = Lock(Exclusive);
    // There is no way this can be opened with WRITE_LOCK now
    assert(file_->file_lock != duckdb::FileLockType::WRITE_LOCK);
    // Open the file with the new flags first
    auto new_handle = buffer_.filesystem->OpenFile(file_->path, flags, lock_type);
    // Swap the file handles
    std::swap(new_handle, file_->handle);
}

/// Flush a file at a path.
void FilePageBuffer::FlushFile(std::string_view path) {
    DEBUG_TRACE();
    // We need to find the file first
    auto dir_guard = Lock();
    std::shared_ptr<FileRef> file_ref;
    if (auto it = files_by_path.find(path); it != files_by_path.end()) {
        file_ref = std::make_shared<FileRef>(*this, *files.at(it->second->file_id).get());
    } else {
        return;
    }
    dir_guard.unlock();

    // Flush the file
    auto file_guard = file_ref->Lock(Shared);
    file_ref->Flush(file_guard);
}

/// Flush all files in the buffer
void FilePageBuffer::FlushFiles() {
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

/// Flush a frame.
/// Assumes that the file of the frame is under control.
void FilePageBuffer::FlushFrame(BufferFrame& frame, FileGuardRefVariant file_guard, DirectoryGuard& dir_guard) {
    DEBUG_TRACE();
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
void FilePageBuffer::ReleaseFile(BufferedFile& file, FileGuardRefVariant file_guard, DirectoryGuard& dir_guard) {
    DEBUG_TRACE();
    // Someone opened the file in the meantime?
    if (file.GetReferenceCount() > 1) return;

    // Flush all file frames
    for (auto iter = file.frames.begin(); iter != file.frames.end(); ++iter) {
        auto& frame = **iter;

        // Flush frame
        FlushFrame(frame, file_guard, dir_guard);

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
    auto iter = files.find(file.file_id);
    auto tmp = std::move(iter->second);
    files.erase(iter);
    std::visit([&](auto& l) { l.get().unlock(); }, file_guard);
}

/// Truncate a file
void FilePageBuffer::FileRef::Truncate(uint64_t new_size) {
    DEBUG_TRACE();
    // Modify file file.
    // This will lock out ALL file users.
    auto* file = file_;
    auto file_lock = Lock(Exclusive);

    // Is not opened in WRITE mode?
    if ((file_->file_flags & duckdb::FileFlags::FILE_FLAGS_WRITE) == 0) {
        throw std::runtime_error("file is not opened in write mode");
    }

    // Truncate the file
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

std::vector<uint64_t> FilePageBuffer::GetFIFOList() const {
    std::vector<uint64_t> fifo_list;
    fifo_list.reserve(fifo.size());
    for (auto* page : fifo) {
        fifo_list.push_back(page->frame_id);
    }
    return fifo_list;
}

std::vector<uint64_t> FilePageBuffer::GetLRUList() const {
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
