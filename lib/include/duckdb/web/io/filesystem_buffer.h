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
#include <shared_mutex>
#include <stack>
#include <unordered_map>
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

class FileSystemBuffer;

class FileSystemBufferFrame {
   protected:
    friend class FileSystemBuffer;
    /// A position in the LRU queue
    using list_position = std::list<FileSystemBufferFrame*>::iterator;

    /// The frame state
    enum State { NEW, LOADING, LOADED, EVICTING, RELOADED };

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
    /// Flush in progress?
    bool flush_in_progress = false;
    /// Position of this page in the FIFO list
    list_position fifo_position;
    /// Position of this page in the LRU list
    list_position lru_position;

    /// The frame latch
    std::shared_mutex access_latch;
    /// Is locked exclusively?
    bool locked_exclusively = false;

    /// Lock a buffer frame.
    void LockFrame(bool exclusive);
    /// Unlock a buffer frame
    void UnlockFrame();

   public:
    /// Constructor
    FileSystemBufferFrame(uint64_t frame_id, list_position fifo_position, list_position lru_position);
    /// Get number of users
    auto GetUserCount() const { return num_users; }
    /// Returns a pointer to this page data
    nonstd::span<char> GetData() { return {buffer.get(), data_size}; }
};

class FileSystemBuffer {
   protected:
    /// A buffered file
    struct BufferedFile {
        /// The file id
        uint16_t file_id = 0;
        /// The path
        std::string path = {};
        /// The file
        std::unique_ptr<duckdb::FileHandle> handle = nullptr;
        /// The file references
        uint64_t file_refs = 0;
        /// The released file refs
        uint64_t file_refs_released = 0;
        /// The file size as present on disk.
        uint64_t file_size_persisted = 0;
        /// The buffered file size.
        /// We grow files on flush if the user wrote past the end.
        /// For that purpose, we maintain a required file size here that can be bumped through RequireFileSize.
        uint64_t file_size_buffered = 0;
        /// The truncation lock.
        std::mutex truncation_lock = {};
        /// This latch ensures that reads and writes are blocked during truncation.
        std::shared_mutex file_access = {};

        /// Constructor
        BufferedFile(uint16_t file_id, std::string_view path, std::unique_ptr<duckdb::FileHandle> file = nullptr);

        /// Access the file for reads or writes
        auto AccessFile() { return std::shared_lock{file_access}; }
        /// Block the file access for truncation
        auto BlockFileAccess() { return std::unique_lock{file_access}; }
    };

   public:
    /// A file reference
    class FileRef {
        friend class FileSystemBuffer;

       protected:
        /// The buffer manager
        FileSystemBuffer& buffer_manager_;
        /// The file
        BufferedFile* file_;
        /// The constructor
        explicit FileRef(FileSystemBuffer& buffer_manager, BufferedFile& file);

       public:
        /// Copy constructor
        FileRef(const FileRef& other);
        /// Move constructor
        FileRef(FileRef&& other);
        /// Destructor
        ~FileRef();
        /// Copy assignment
        FileRef& operator=(const FileRef& other);
        /// Move assignment
        FileRef& operator=(FileRef&& other);
        /// Is set?
        operator bool() const { return !!file_; }
        /// Get file id
        auto& GetFileID() const { return file_->file_id; }
        /// Get path
        auto& GetPath() const { return file_->path; }
        /// Get handle
        auto& GetHandle() const { return *file_->handle; }
        /// Get the size
        auto GetSize() const { return file_->file_size_buffered; }
        /// Release the file ref
        void Release();
    };

    /// A buffer reference
    class BufferRef {
        friend class FileSystemBuffer;

       protected:
        /// The buffer manager
        FileSystemBuffer& buffer_manager_;
        /// The file
        FileSystemBufferFrame* frame_;
        /// The constructor
        explicit BufferRef(FileSystemBuffer& buffer_manager, FileSystemBufferFrame& frame);

       public:
        /// Copy constructor
        BufferRef(const BufferRef& other);
        /// Move constructor
        BufferRef(BufferRef&& other);
        /// Destructor
        ~BufferRef();
        /// Copy assignment
        BufferRef& operator=(const BufferRef& other);
        /// Move assignment
        BufferRef& operator=(BufferRef&& other);
        /// Is set?
        operator bool() const { return !!frame_; }
        /// Clone the buffer ref
        auto Clone();
        /// Access the data
        auto GetData() { return frame_->GetData(); }
        /// Release the file ref
        void Release();
        /// Mark as dirty
        void MarkAsDirty() { frame_->is_dirty = true; }
        /// Require a frame size
        void RequireSize(uint64_t n);
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
    std::map<uint64_t, FileSystemBufferFrame> frames = {};
    /// FIFO list of frames
    std::list<FileSystemBufferFrame*> fifo = {};
    /// LRU list of frames
    std::list<FileSystemBufferFrame*> lru = {};

    /// Evict all file frames
    void EvictFileFrames(BufferedFile& file, std::unique_lock<std::mutex>& latch);
    /// Grow a file if required
    void GrowFileIfRequired(BufferedFile& file, std::unique_lock<std::mutex>& latch);
    /// Release a file ref
    void ReleaseFile(BufferedFile& file, std::unique_lock<std::mutex>& latch);
    /// Loads the page from disk
    void LoadFrame(FileSystemBufferFrame& frame, std::unique_lock<std::mutex>& latch);
    /// Writes the page to disk if it is dirty
    void FlushFrame(FileSystemBufferFrame& frame, std::unique_lock<std::mutex>& latch);
    /// Returns the next page that can be evicted.
    /// Returns nullptr, when no page can be evicted.
    std::unique_ptr<char[]> EvictBufferFrame(std::unique_lock<std::mutex>& latch);
    /// Allocate a buffer for a frame.
    /// Evicts a page if neccessary
    std::unique_ptr<char[]> AllocateFrameBuffer(std::unique_lock<std::mutex>& latch);

    /// Unfix a frame.
    /// The frame is written back eventually when is_dirty is passed.
    void UnfixPage(FileSystemBufferFrame& frame, bool is_dirty);

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
    FileRef OpenFile(std::string_view path, std::unique_ptr<duckdb::FileHandle> file = nullptr);
    /// Get The file size
    uint64_t GetFileSize(const FileRef& file);

    /// Returns a reference to a `FileSystemBufferFrame` object for a given page id. When
    /// the page is not loaded into memory, it is read from disk. Otherwise the
    /// loaded page is used.
    BufferRef FixPage(const FileRef& file, uint64_t page_id, bool exclusive);
    /// Flush all file frames to disk
    void FlushFile(const FileRef& file);
    /// Flush file matching name to disk
    void FlushFile(std::string_view path);
    /// Flush all outstanding frames to disk
    void Flush();

    /// Read at most n bytes
    uint64_t Read(const FileRef& file, void* buffer, uint64_t n, duckdb::idx_t offset);
    /// Write at most n bytes
    uint64_t Write(const FileRef& file, const void* buffer, uint64_t n, duckdb::idx_t offset);
    /// Truncate the file
    void Truncate(const FileRef& file, uint64_t new_size);

    /// Returns the page ids of all pages that are in the FIFO list in FIFO order.
    std::vector<uint64_t> GetFIFOList() const;
    /// Returns the page ids of all pages that are in the LRU list in LRU order.
    std::vector<uint64_t> GetLRUList() const;
};

}  // namespace io
}  // namespace web
}  // namespace duckdb

#endif
