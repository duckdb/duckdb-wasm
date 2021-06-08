#ifndef INCLUDE_DUCKDB_WEB_IO_FILESYSTEM_BUFFER_H
#define INCLUDE_DUCKDB_WEB_IO_FILESYSTEM_BUFFER_H

#include <atomic>
#include <cstddef>
#include <cstdint>
#include <exception>
#include <list>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <shared_mutex>
#include <stack>
#include <unordered_map>
#include <variant>
#include <vector>

#include "duckdb/common/file_system.hpp"
#include "duckdb/web/io/default_filesystem.h"
#include "duckdb/web/io/web_filesystem.h"
#include "nonstd/span.h"

namespace duckdb {
namespace web {
namespace io {

/// We use a dedicated lightweight FileSystemBuffer for paged I/O in and out of WebAssembly.
/// The buffer manager is tailored towards WASM in the following points:
///
/// - The only goal is to buffer the interop with js.
/// - We're complementing the actual buffer management of DuckDB.
///   We do not fail if the buffer capacity is reached but over-allocate new buffers instead.
///   (Memory management is not our business, we're only caching I/O buffers)
/// - We maintain few I/O buffers with the 2-Queue buffer replacement strategy to differentiate sequential scans
///   from hot pages.
/// - We still never hold the global directory latch while doing IO since reads/writes might go to disk.

class FileSystemBuffer {
   public:
    /// A file guard
    using FileGuard = std::variant<std::unique_lock<std::shared_mutex>, std::shared_lock<std::shared_mutex>>;
    /// A frame guard
    using FrameGuard = std::variant<std::unique_lock<std::shared_mutex>, std::shared_lock<std::shared_mutex>>;
    /// Exclusive
    enum ExclusiveTag { Exclusive };
    /// Exclusive
    enum SharedTag { Shared };
    /// Forward declare file ref
    class FileRef;

   protected:
    /// A buffered file
    struct BufferedFile {
        /// The file id
        uint16_t file_id = 0;
        /// The path
        std::string path = {};
        /// The file
        std::unique_ptr<duckdb::FileHandle> handle = nullptr;
        /// This latch ensures that reads and writes are blocked during truncation.
        std::shared_mutex file_latch = {};
        /// The user references
        int64_t num_users = 0;
        /// The frame references
        int64_t num_frames = 0;
        /// The file size
        uint64_t file_size = 0;

        /// Constructor
        BufferedFile(uint16_t file_id, std::string_view path, std::unique_ptr<duckdb::FileHandle> file = nullptr)
            : file_id(file_id), path(path), handle(std::move(file)) {}

        /// Get the number of references
        auto GetReferenceCount() const { return num_users + num_frames; }
        /// Lock the file shared
        auto Lock(SharedTag) { return std::shared_lock{file_latch}; }
        /// Lock the file exclusively
        auto Lock(ExclusiveTag) { return std::unique_lock{file_latch}; }
    };

    /// A buffer frame, the central data structure to hold data
    class BufferFrame {
       protected:
        friend class FileSystemBuffer;
        /// A position in the LRU queue
        using list_position = std::list<BufferFrame*>::iterator;

        /// The frame state
        enum State { NEW, LOADING, LOADED, EVICTING, RELOADED };

        /// The buffered file
        BufferedFile& file;
        /// The frame id
        uint64_t frame_id = -1;
        /// The frame state.
        State frame_state = State::NEW;
        /// The data buffer (constant page size)
        std::unique_ptr<char[]> buffer = nullptr;
        /// How many times this page has been fixed
        uint64_t num_users = 0;
        /// The data size
        uint32_t data_size = 0;
        /// Is the page dirty?
        bool is_dirty = false;
        /// Position of this page in the FIFO list
        list_position fifo_position;
        /// Position of this page in the LRU list
        list_position lru_position;
        /// The frame latch
        std::shared_mutex frame_latch;

       public:
        /// Constructor
        BufferFrame(BufferedFile& file, uint64_t frame_id, list_position fifo_position, list_position lru_position);
        /// ~Destructor
        ~BufferFrame() { --file.num_frames; }
        /// Delete copy constructor
        BufferFrame(const BufferFrame& other) = delete;
        /// Delete copy assignment
        BufferFrame& operator=(const BufferFrame& other) = delete;

        /// Returns a pointer to this page data
        nonstd::span<char> GetData() { return {buffer.get(), data_size}; }
        /// Lock the frame exclusively
        auto Lock(ExclusiveTag) { return std::shared_lock{frame_latch}; }
        /// Lock the frame shared
        auto Lock(SharedTag) { return std::unique_lock{frame_latch}; }
    };

   public:
    /// The buffer ref base class
    class BufferRef {
        friend class FileSystemBuffer;

       protected:
        /// The file
        std::shared_ptr<FileRef> file_;
        /// The frame
        BufferFrame* frame_;
        /// The frame guard
        FrameGuard frame_guard_;

        /// The constructor
        explicit BufferRef(std::shared_ptr<FileRef> file, BufferFrame& frame, FrameGuard frame_guard);

       public:
        /// Move constructor
        BufferRef(BufferRef&& other) : file_(other.file_), frame_(other.frame_) {
            other.file_ = nullptr;
            other.frame_ = nullptr;
        }
        /// Destructor
        ~BufferRef() { Release(); }
        /// Move assignment
        BufferRef& operator=(BufferRef&& other) {
            Release();
            file_ = other.file_;
            other.frame_ = nullptr;
            return *this;
        }
        /// Is set?
        operator bool() const { return !!frame_; }
        /// Access the data
        auto GetData() { return frame_->GetData(); }
        /// Mark as dirty
        void MarkAsDirty() { frame_->is_dirty = true; }
        /// Release the file ref
        void Release();
    };

    /// A file reference
    class FileRef : public std::enable_shared_from_this<FileRef> {
        friend class FileSystemBuffer;

       protected:
        /// The buffer manager
        FileSystemBuffer& buffer_;
        /// The file
        BufferedFile* file_;
        /// The current file lock.
        std::variant<std::unique_lock<std::shared_mutex>, std::shared_lock<std::shared_mutex>, std::monostate>
            file_guard_;
        /// The number of buffer refs of this user
        size_t buffer_refs_;

        /// Flush a buffer frame
        void FlushFrame(FileSystemBuffer::BufferFrame& frame);
        /// Flush a buffer frame
        void FlushFrame(FileSystemBuffer::BufferFrame& frame, std::unique_lock<std::mutex>& dir_guard);
        /// Loads the page from disk
        void LoadFrame(BufferFrame& frame, std::unique_lock<std::mutex>& dir_guard);

       public:
        /// Constructor
        explicit FileRef(FileSystemBuffer& buffer);
        /// The constructor
        explicit FileRef(FileSystemBuffer& buffer, BufferedFile& file) : buffer_(buffer), file_(&file) {
            // Is always constructed with directory latch
            ++file.num_users;
        }
        /// Move constructor
        FileRef(FileRef&& other) : buffer_(other.buffer_), file_(other.file_) { other.file_ = nullptr; }
        /// Destructor
        ~FileRef() { Release(); }
        /// Is set?
        operator bool() const { return !!file_; }
        /// Get file id
        auto& GetFileID() const { return file_->file_id; }
        /// Get path
        auto& GetPath() const { return file_->path; }
        /// Get handle
        auto& GetHandle() const { return *file_->handle; }
        /// Get the size
        auto GetSize() const { return file_->file_size; }
        /// Release the file ref
        void Release();

        /// Fix file exclusively
        BufferRef FixPage(size_t page_id, bool exclusive);
        /// Unfix a buffer frame
        void Unfix(BufferRef&& ref, bool is_dirty);

        /// Read at most n bytes
        uint64_t Read(void* buffer, uint64_t n, duckdb::idx_t offset);
        /// Write at most n bytes
        uint64_t Write(const void* buffer, uint64_t n, duckdb::idx_t offset);
        /// Truncate the file
        void Truncate(uint64_t new_size);
        /// Flush the file
        void Flush();
    };

   protected:
    /// The page size
    const uint64_t page_size_bits;
    /// The page capacity
    const uint64_t page_capacity;

    /// The actual filesystem
    std::shared_ptr<duckdb::FileSystem> filesystem;

    /// Latch that protects all of the following member variables
    std::mutex directory_latch;

    /// Maps file ids to their file infos
    std::unordered_map<uint16_t, std::unique_ptr<BufferedFile>> files = {};
    /// The file ids
    std::unordered_map<std::string_view, uint16_t> files_by_path = {};
    /// The free file ids
    std::stack<uint16_t> free_file_ids = {};
    /// The next allocated file ids
    uint16_t allocated_file_ids = 0;

    /// Maps frame ids to frames
    std::map<uint64_t, BufferFrame> frames = {};
    /// FIFO list of frames
    std::list<BufferFrame*> fifo = {};
    /// LRU list of frames
    std::list<BufferFrame*> lru = {};

    /// Returns the next page that can be evicted.
    /// Returns nullptr, when no page can be evicted.
    std::unique_ptr<char[]> EvictAnyBufferFrame(std::unique_lock<std::mutex>& dir_guard);
    /// Allocate a buffer for a frame.
    /// Evicts a page if neccessary
    std::unique_ptr<char[]> AllocateFrameBuffer(std::unique_lock<std::mutex>& dir_guard);

    /// Fix a page
    BufferRef FixPage(std::shared_ptr<FileRef>& file_ref, size_t page_id, FileGuard& file_guard);
    /// Flush a frame
    void FlushFrame(BufferFrame& file, std::unique_lock<std::mutex>& dir_guard, FileGuard& file_guard);
    /// Releases a file
    void ReleaseFile(BufferedFile& file, std::unique_lock<std::mutex>& dir_guard, FileGuard file_guard);

   public:
    /// Constructor.
    /// Use 10 * 16KiB pages by default (1 << 14)
    FileSystemBuffer(std::shared_ptr<duckdb::FileSystem> filesystem = io::CreateDefaultFileSystem(),
                     uint64_t page_capacity = 10, uint64_t page_size_bits = 14);
    /// Destructor
    virtual ~FileSystemBuffer();

    /// Get the filesystem
    auto& GetFileSystem() { return filesystem; }
    /// Get the page size
    uint64_t GetPageSize() const { return 1 << page_size_bits; }
    /// Get the page shift
    auto GetPageSizeShift() const { return page_size_bits; }
    /// Get a page id from an offset
    uint64_t GetPageIDFromOffset(uint64_t offset) { return offset >> page_size_bits; }

    /// Open a file
    std::shared_ptr<FileRef> OpenFile(std::string_view path, std::unique_ptr<duckdb::FileHandle> file = nullptr);
    /// Flush file matching name to disk
    void FlushFile(std::string_view path);
    /// Flush all outstanding frames to disk
    void Flush();
    /// Release a file
    void Release(BufferedFile& file);

    /// Returns the page ids of all pages that are in the FIFO list in FIFO order.
    std::vector<uint64_t> GetFIFOList() const;
    /// Returns the page ids of all pages that are in the LRU list in LRU order.
    std::vector<uint64_t> GetLRUList() const;
};

}  // namespace io
}  // namespace web
}  // namespace duckdb

#endif
