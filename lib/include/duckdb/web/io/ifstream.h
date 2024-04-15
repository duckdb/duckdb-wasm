#ifndef INCLUDE_DUCKDB_WEB_IO_STREAMBUF_H_
#define INCLUDE_DUCKDB_WEB_IO_STREAMBUF_H_

#include <streambuf>

#include "duckdb/web/io/file_page_buffer.h"

namespace duckdb {
namespace web {
namespace io {

class InputFileStreamBuffer : public std::streambuf {
   protected:
    /// The buffer manager
    std::shared_ptr<FilePageBuffer> file_page_buffer_;
    /// The file
    std::unique_ptr<FilePageBuffer::FileRef> file_;
    /// The buffer
    FilePageBuffer::BufferRef buffer_;
    /// The end of the readable data (might be smaller than the actual file size if the stream is sliced)
    size_t data_end_;
    /// The next page id
    size_t next_page_id_;

   protected:
    /// Load next page
    bool NextPage();
    /// Get the position
    size_t GetPosition() {
        assert(next_page_id_ > 0);
        return ((next_page_id_ - 1) << file_page_buffer_->GetPageSizeShift()) + (gptr() - eback());
    }
    /// Virtual function (to be read s-how-many-c) called by other member functions to get an estimate
    /// on the number of characters available in the associated input sequence.
    std::streamsize showmanyc() override { return file_->GetSize() - GetPosition(); }
    /// Retrieves characters from the controlled input sequence and stores them in the array pointed by s,
    /// until either n characters have been loaded or the end of the sequence is reached.
    std::streamsize xsgetn(char* out, std::streamsize n) override;
    /// Ensures that at least one character is available in the input area by updating the pointers to
    /// the input area (if needed) and reading more data in from the input sequence (if applicable).
    /// Returns the value of that character (converted to int_type with Traits::to_int_type(c)) on success or
    /// Traits::eof() on failure.
    int_type underflow() override {
        if (gptr() < egptr()) return sgetc();
        return NextPage() ? sgetc() : traits_type::eof();
    }
    /// Ensures that at least one character is available in the input area by updating the pointers to
    /// the input area (if needed). On success returns the value of that character and advances the value of
    /// the get pointer by one character. On failure returns traits::eof().
    int_type uflow() override {
        if (gptr() < egptr()) return sbumpc();
        return NextPage() ? sgetc() : traits_type::eof();
    }
    /// Set internal position pointer to relative position
    pos_type seekoff(off_type off, std::ios_base::seekdir dir, std::ios_base::openmode) override;
    /// Set internal position pointer to absolute position
    pos_type seekpos(pos_type pos, std::ios_base::openmode) override;

   public:
    /// Constructor
    InputFileStreamBuffer(std::shared_ptr<FilePageBuffer> file_page_buffer, std::string_view path)
        : file_page_buffer_(std::move(file_page_buffer)),
          file_(file_page_buffer_->OpenFile(path, duckdb::FileFlags::FILE_FLAGS_READ)),
          buffer_(file_->FixPage(0, false)),
          data_end_(file_->GetSize()),
          next_page_id_(1) {
        auto data = buffer_.GetData();
        setg(data.data(), data.data(), data.data() + data.size());
    }
    /// Constructor
    InputFileStreamBuffer(const InputFileStreamBuffer& other)
        : file_page_buffer_(other.file_page_buffer_),
          file_(other.file_page_buffer_->OpenFile(other.file_->GetPath(), duckdb::FileFlags::FILE_FLAGS_READ)),
          buffer_(other.file_->FixPage(other.next_page_id_ - 1, false)),
          data_end_(other.data_end_),
          next_page_id_(other.next_page_id_) {
        auto data = buffer_.GetData();
        setg(data.data(), data.data() + (other.gptr() - other.eback()), data.data() + (other.egptr() - other.eback()));
    }
    /// Constructor
    InputFileStreamBuffer(InputFileStreamBuffer&& other)
        : file_page_buffer_(std::move(other.file_page_buffer_)),
          file_(std::move(other.file_)),
          buffer_(std::move(other.buffer_)),
          data_end_(other.data_end_),
          next_page_id_(other.next_page_id_) {}

    /// Scan a slice of the file
    void Slice(uint64_t offset, uint64_t size);
};

class InputFileStream : public std::istream {
   protected:
    /// The buffer
    InputFileStreamBuffer buffer_;

   public:
    /// Constructor
    InputFileStream(std::shared_ptr<FilePageBuffer> file_page_buffer, std::string_view path)
        : buffer_(std::move(file_page_buffer), path), std::istream(&buffer_) {}
    /// Copy constructor
    InputFileStream(const InputFileStream& other) : buffer_(other.buffer_), std::istream(&buffer_){};
    /// Scan a slice of the file
    void Rewind() { buffer_.Slice(0, 0); }
    /// Scan a slice of the file
    void Slice(uint64_t offset, uint64_t size = 0) { buffer_.Slice(offset, size); }
};

}  // namespace io
}  // namespace web
}  // namespace duckdb

#endif
