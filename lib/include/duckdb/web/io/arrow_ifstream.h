#ifndef INCLUDE_DUCKDB_WEB_ARROW_STREAMS_H_
#define INCLUDE_DUCKDB_WEB_ARROW_STREAMS_H_

#include "arrow/buffer.h"
#include "arrow/io/interfaces.h"
#include "duckdb/common/constants.hpp"
#include "duckdb/common/file_system.hpp"
#include "duckdb/web/io/file_page_buffer.h"

namespace duckdb {
namespace web {
namespace io {

class ArrowInputFileStream : virtual public arrow::io::InputStream {
   protected:
    /// An arrow buffer for a view into a fixed page
    struct PageView : public arrow::Buffer {
        /// The buffer ref which will unfix the page on destruction
        FilePageBuffer::BufferRef buffer;
        /// Constructor
        PageView(FilePageBuffer::BufferRef buffer, nonstd::span<char> view)
            : arrow::Buffer(reinterpret_cast<uint8_t*>(view.data()), view.size()), buffer(std::move(buffer)) {}
        /// Constructor
        PageView(PageView&& other) : arrow::Buffer(other.data(), other.size()), buffer(std::move(other.buffer)) {}
        /// Destructor
        ~PageView() = default;
        /// Deleted copy constructor
        PageView(const PageView& other) = delete;
        /// Move assginment
        PageView& operator=(PageView&& other) {
            buffer = std::move(other.buffer);
            return *this;
        }
    };

    /// The file system
    std::shared_ptr<FilePageBuffer> file_page_buffer_;
    /// The file id
    std::shared_ptr<FilePageBuffer::FileRef> file_;
    /// The file position
    size_t file_position_ = 0;
    /// The temporarily fixed page
    std::optional<PageView> tmp_page_ = std::nullopt;

    /// Read data from current file position without advancing the position
    arrow::Result<PageView> PeekView(int64_t nbytes);

   public:
    /// Constructor
    ArrowInputFileStream(std::shared_ptr<io::FilePageBuffer> file_page_buffer, std::string_view path);
    /// Destructor
    ~ArrowInputFileStream() override;

    /// File interface

    /// Close the stream cleanly
    ///
    /// After Close() is called, closed() returns true and the stream is not
    /// available for further operations.
    arrow::Status Close() override;

    /// Close the stream abruptly
    ///
    /// This method does not guarantee that any pending data is flushed.
    /// It merely releases any underlying resource used by the stream for
    /// its operation.
    ///
    /// After Abort() is called, closed() returns true and the stream is not
    /// available for further operations.
    arrow::Status Abort() override;

    /// \brief Return the position in this stream
    arrow::Result<int64_t> Tell() const override;

    /// \brief Return whether the stream is closed
    bool closed() const override;

    /// Readable

    /// Read data from current file position.
    ///
    /// Read at most `nbytes` from the current file position into `out`.
    /// The number of bytes read is returned.
    arrow::Result<int64_t> Read(int64_t nbytes, void* out) override;

    /// Read data from current file position.
    ///
    /// Read at most `nbytes` from the current file position. Less bytes may
    /// be read if EOF is reached. This method updates the current file position.
    ///
    /// In some cases (e.g. a memory-mapped file), this method may avoid a
    /// memory copy.
    arrow::Result<std::shared_ptr<arrow::Buffer>> Read(int64_t nbytes) override;

    /// Input stream

    /// \brief Advance or skip stream indicated number of bytes
    /// \param[in] nbytes the number to move forward
    /// \return Status
    arrow::Status Advance(int64_t nbytes);

    /// Return zero-copy string_view to upcoming bytes.
    ///
    /// Do not modify the stream position. The view becomes invalid after
    /// any operation on the stream.  May trigger buffering if the requested
    /// size is larger than the number of buffered bytes.
    ///
    /// May return NotImplemented on streams that don't support it.
    ///
    /// \param[in] nbytes the maximum number of bytes to see
    arrow::Result<std::string_view> Peek(int64_t nbytes) override;

    /// Return true if InputStream is capable of zero copy Buffer reads
    ///
    /// Zero copy reads imply the use of Buffer-returning Read() overloads.
    ///
    bool supports_zero_copy() const override { return true; }
};

}  // namespace io
}  // namespace web
}  // namespace duckdb

#endif  // INCLUDE_DUCKDB_WEB_ARROW_STREAMS_H_
