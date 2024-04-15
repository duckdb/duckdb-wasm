#ifndef INCLUDE_DUCKDB_WEB_IO_FILE_PAGE_BUFFER_H
#define INCLUDE_DUCKDB_WEB_IO_FILE_PAGE_BUFFER_H

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
#include <unordered_set>
#include <variant>
#include <vector>

#include "duckdb/common/constants.hpp"
#include "duckdb/common/file_system.hpp"
#include "duckdb/web/io/file_page_defaults.h"
#include "duckdb/web/io/web_filesystem.h"
#include "duckdb/web/utils/parallel.h"
#include "nonstd/span.h"

namespace duckdb {
namespace web {
namespace io {

/// We use a dedicated lightweight buffer manager for paged I/O in and out of WebAssembly.
/// Our web filesystem can serve files from locations with very different access latencies.
/// E.g. memory, HTTP range requests or disk via the Browser FileSystem APIs.
/// We therefore want to buffer explicitly for all expensive accesses and use direct I/O for memory-backed files.
///
/// Our I/O stack looks rougly like the following:
///
///             DuckDB              json::TableReader io::InputFileStreamBuffer
///               |                         |                  |
///               V                         +------------------+
///        io::BufferedFileSystem           |
///               |      |                  V
///               |      +--------> io::FilePageBuffer <-> Prefetcher
///    Direct I/O |                         |
///               |      +------------------+
///               |      |
///               V      V
///            io::WebFileSystem
///              |     |     |
///        +-----+     |     +--------+
///        |           |              |
///        V           V              V
///      Buffer    HTTP Ranges  FileReaderSync
///

class FilePageBuffer {
   public:
    /// A directory guard
    using DirectoryGuard = std::unique_lock<LightMutex>;
    /// A frame guard
    using FrameGuardVariant = std::variant<std::unique_lock<SharedMutex>, std::shared_lock<SharedMutex>>;
    /// A file guard reference variant
    using FileGuardRefVariant = std::variant<std::reference_wrapper<std::unique_lock<SharedMutex>>,
                                             std::reference_wrapper<std::shared_lock<SharedMutex>>>;
    /// Exclusive
    enum ExclusiveTag { Exclusive };
    /// Exclusive
    enum SharedTag { Shared };
    /// Forward declare file ref
    class FileRef;

   protected:
    /// Forward declare buffer frame
    class BufferFrame;
    /// A buffered file
    struct BufferedFile {
        /// The file id
        uint16_t file_id = 0;
        /// The path
        std::string path = {};
        /// The file
        std::unique_ptr<duckdb::FileHandle> handle = nullptr;

        /// This latch ensures that reads and writes are blocked during truncation.
        SharedMutex file_latch = {};
        /// The file flags
        duckdb::FileOpenFlags file_flags = 0;
        /// The file size
        uint64_t file_size = 0;
        /// The user references
        int64_t num_users = 0;
        /// The loaded frame
        std::list<BufferFrame*> frames = {};

        /// The file statistics (if any)
        std::shared_ptr<FileStatisticsCollector> file_stats = nullptr;

        /// Constructor
        BufferedFile(uint16_t file_id, std::string_view path, duckdb::FileOpenFlags flags)
            : file_id(file_id), path(path), file_flags(flags) {}
        /// Get the number of references
        auto GetReferenceCount() const { return num_users; }
    };

    /// A buffer frame, the central data structure to hold data
    class BufferFrame {
       protected:
        friend class FilePageBuffer;
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
        std::atomic<bool> is_dirty = false;
        /// Position in the file frame list
        list_position file_frame_position;
        /// Position of this page in the FIFO list
        list_position fifo_position;
        /// Position of this page in the LRU list
        list_position lru_position;
        /// The frame latch
        SharedMutex frame_latch = {};

       public:
        /// Constructor
        BufferFrame(BufferedFile& file, uint64_t frame_id, list_position fifo_position, list_position lru_position);
        /// ~Destructor
        ~BufferFrame() {
            assert(num_users == 0);
            assert(file_frame_position != file.frames.end());
            file.frames.erase(file_frame_position);
        }
        /// Delete copy constructor
        BufferFrame(const BufferFrame& other) = delete;
        /// Delete copy assignment
        BufferFrame& operator=(const BufferFrame& other) = delete;

        /// Get the user count
        auto GetUserCount() { return num_users; }
        /// Returns a pointer to this page data
        auto GetData() { return nonstd::span<char>{buffer.get(), data_size}; }
        /// Lock frame exclusively
        inline auto Lock(SharedTag) { return std::shared_lock<SharedMutex>{frame_latch}; }
        /// Lock frame exclusively
        inline auto Lock(ExclusiveTag) { return std::unique_lock<SharedMutex>{frame_latch}; }
    };

   public:
    /// A shared file guard
    using SharedFileGuard = std::shared_lock<SharedMutex>;
    /// A unique file guard
    using UniqueFileGuard = std::unique_lock<SharedMutex>;

    /// The buffer ref base class
    class BufferRef {
        friend class FilePageBuffer;

       protected:
        /// The file
        FileRef* file_;
        /// The file
        SharedFileGuard file_guard_;
        /// The frame
        BufferFrame* frame_;
        /// The frame guard
        FrameGuardVariant frame_guard_;

        /// The constructor
        explicit BufferRef(FileRef& file_ref, SharedFileGuard&& file_guard, BufferFrame& frame,
                           FrameGuardVariant frame_guard);

       public:
        /// Move constructor
        BufferRef(BufferRef&& other)
            : file_(other.file_),
              file_guard_(std::move(other.file_guard_)),
              frame_(other.frame_),
              frame_guard_(std::move(other.frame_guard_)) {
            other.file_ = nullptr;
            other.frame_ = nullptr;
        }
        /// Destructor
        ~BufferRef() { Release(); }
        /// Move assignment
        BufferRef& operator=(BufferRef&& other) {
            Release();
            file_ = std::move(other.file_);
            file_guard_ = std::move(other.file_guard_);
            frame_ = std::move(other.frame_);
            frame_guard_ = std::move(other.frame_guard_);
            other.file_ = nullptr;
            other.frame_ = nullptr;
            return *this;
        }
        /// Is set?
        operator bool() const { return !!frame_; }
        /// Access the data
        auto GetData() { return frame_->GetData(); }
        /// Mark as dirty
        void MarkAsDirty();
        /// Release the file ref
        void Release();
    };

    /// A file reference
    class FileRef {
        friend class FilePageBuffer;

       protected:
        /// The buffer manager
        FilePageBuffer& buffer_;
        /// The file
        BufferedFile* file_ = nullptr;

        /// Lock a file exclusively
        inline auto Lock(ExclusiveTag) { return std::unique_lock<SharedMutex>{file_->file_latch}; }
        /// Lock a file shared
        inline auto Lock(SharedTag) { return std::shared_lock<SharedMutex>{file_->file_latch}; }
        /// Flush the file
        void Flush(FileGuardRefVariant file_guard);
        /// Loads the page from disk
        void LoadFrame(BufferFrame& frame, FileGuardRefVariant file_guard, DirectoryGuard& dir_guard);
        /// Fix file with file lock
        std::pair<BufferFrame*, FrameGuardVariant> FixPage(uint64_t page_id, bool exclusive,
                                                           FileGuardRefVariant file_guard);
        /// Append n bytes
        void Append(void* buffer, uint64_t n, UniqueFileGuard& file_guard);
        /// Reopen as writeable
        void ReOpen(duckdb::FileOpenFlags flags);

       public:
        /// Constructor
        explicit FileRef(FilePageBuffer& buffer);
        /// The constructor
        explicit FileRef(FilePageBuffer& buffer, BufferedFile& file) : buffer_(buffer), file_(&file) {
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
        bool Release(bool keep_dangling = true);

        /// Fix file exclusively
        BufferRef FixPage(uint64_t page_id, bool exclusive);
        /// Flush the file
        void Flush();
        /// Truncate the file
        void Truncate(uint64_t new_size);
        /// Read at most n bytes
        uint64_t Read(void* buffer, uint64_t n, duckdb::idx_t offset);
        /// Write at most n bytes
        uint64_t Write(void* buffer, uint64_t n, duckdb::idx_t offset);
        /// Append n bytes
        void Append(void* buffer, uint64_t n);
    };

   protected:
    /// The page size
    const uint64_t page_size_bits;
    /// The page capacity
    const uint64_t page_capacity;

    /// The actual filesystem
    std::shared_ptr<duckdb::FileSystem> filesystem;

    /// Latch that protects all of the following member variables
    LightMutex directory_latch;

    /// Maps file ids to their file infos
    std::unordered_map<uint16_t, std::unique_ptr<BufferedFile>> files = {};
    /// The file ids
    std::unordered_map<std::string_view, BufferedFile*> files_by_name = {};
    /// The free file ids
    std::stack<uint16_t> free_file_ids = {};
    /// The frame buffers
    std::stack<std::unique_ptr<char[]>> free_buffers = {};
    /// The next allocated file ids
    uint16_t allocated_file_ids = 0;

    /// Maps frame ids to frames
    std::unordered_map<uint64_t, std::unique_ptr<BufferFrame>> frames = {};
    /// FIFO list of frames
    std::list<BufferFrame*> fifo = {};
    /// LRU list of frames
    std::list<BufferFrame*> lru = {};

    /// The file statistics
    std::shared_ptr<io::FileStatisticsRegistry> file_statistics_;

    /// Lock the directory
    inline auto Lock() { return std::unique_lock{directory_latch}; }

    /// Returns the next page that can be evicted.
    /// Returns nullptr, when no page can be evicted.
    std::unique_ptr<char[]> EvictAnyBufferFrame(DirectoryGuard& dir_guard);
    /// Allocate a buffer for a frame.
    /// Evicts a page if neccessary
    std::unique_ptr<char[]> AllocateFrameBuffer(DirectoryGuard& dir_guard);

    /// Flush a frame
    void FlushFrame(BufferFrame& frame, FileGuardRefVariant file_guard, DirectoryGuard& dir_guard);
    /// Donate a buffer
    void DonateFrameBuffer(std::unique_ptr<char[]> buffer, DirectoryGuard& dir_guard) {
        if (buffer && ((free_buffers.size() + frames.size()) < page_capacity)) {
            free_buffers.push(std::move(buffer));
        }
    }

   public:
    /// Constructor.
    FilePageBuffer(std::shared_ptr<duckdb::FileSystem> filesystem, uint64_t page_capacity = DEFAULT_FILE_PAGE_CAPACITY,
                   uint64_t page_size_bits = DEFAULT_FILE_PAGE_SHIFT);
    /// Destructor
    ~FilePageBuffer();

    /// Get the filesystem
    auto& GetFileSystem() { return filesystem; }
    /// Get the page size
    uint64_t GetPageSize() const { return 1 << page_size_bits; }
    /// Get the page shift
    auto GetPageSizeShift() const { return page_size_bits; }
    /// Get a page id from an offset
    uint64_t GetPageIDFromOffset(uint64_t offset) { return offset >> page_size_bits; }
    /// Configure file statistics
    void ConfigureFileStatistics(std::shared_ptr<FileStatisticsRegistry> registry);
    /// Collect file statistics
    void CollectFileStatistics(std::string_view path, std::shared_ptr<FileStatisticsCollector> collector);

    /// Open a file
    std::unique_ptr<FileRef> OpenFile(std::string_view path, FileOpenFlags flags,
                                      optional_ptr<FileOpener> opener = nullptr);
    /// Is buffered
    bool BuffersFile(std::string_view path);
    /// Flush file matching name to disk
    void FlushFile(std::string_view path);
    /// Flush all outstanding frames to disk
    void FlushFiles();
    /// Try to drop a specific file
    bool TryDropFile(std::string_view file_name);
    /// Drop dangling files
    void DropDanglingFiles();

    /// Returns the page ids of all pages that are in the FIFO list in FIFO order.
    std::vector<uint64_t> GetFIFOList() const;
    /// Returns the page ids of all pages that are in the LRU list in LRU order.
    std::vector<uint64_t> GetLRUList() const;
};

}  // namespace io
}  // namespace web
}  // namespace duckdb

#endif
