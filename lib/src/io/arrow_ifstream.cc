#include "duckdb/web/io/arrow_ifstream.h"

#include <iostream>

#include "arrow/buffer.h"
#include "arrow/result.h"
#include "duckdb/common/file_system.hpp"
#include "duckdb/web/io/file_page_buffer.h"

namespace duckdb {
namespace web {
namespace io {

/// Constructor
ArrowInputFileStream::ArrowInputFileStream(std::shared_ptr<FilePageBuffer> file_page_buffer, std::string_view path)
    : file_page_buffer_(std::move(file_page_buffer)),
      file_(file_page_buffer_->OpenFile(path, duckdb::FileFlags::FILE_FLAGS_READ)) {}

/// Destructor
ArrowInputFileStream::~ArrowInputFileStream() {
    tmp_page_.reset();
    file_->Release();
};

/// Close the input file stream
arrow::Status ArrowInputFileStream::Close() {
    tmp_page_.reset();
    file_->Release();
    return arrow::Status::OK();
}

/// Abort any operations on the input stream
arrow::Status ArrowInputFileStream::Abort() {
    file_->Release();
    return arrow::Status::OK();
}

/// Return the position in the file
arrow::Result<int64_t> ArrowInputFileStream::Tell() const { return file_position_; }
/// Is the stream closed?
bool ArrowInputFileStream::closed() const { return !static_cast<bool>(file_); }

/// Read at most nbytes bytes from the file
arrow::Result<int64_t> ArrowInputFileStream::Read(int64_t nbytes, void* out) {
    tmp_page_.reset();
    auto n = file_->Read(out, nbytes, file_position_);
    file_position_ += n;
    return n;
}

/// Peek at most nbytes bytes from the file
arrow::Result<ArrowInputFileStream::PageView> ArrowInputFileStream::PeekView(int64_t nbytes) {
    // Determine page & offset
    auto page_id = file_position_ >> file_page_buffer_->GetPageSizeShift();
    auto skip_here = file_position_ - page_id * file_page_buffer_->GetPageSize();
    auto read_here = std::min<size_t>(nbytes, file_page_buffer_->GetPageSize() - skip_here);

    // Read page
    auto page = file_->FixPage(page_id, false);
    assert(skip_here <= page.GetData().size());
    auto data = page.GetData().subspan(skip_here);
    return PageView{std::move(page), data};
}

/// Read at most nbytes bytes from the file
arrow::Result<std::shared_ptr<arrow::Buffer>> ArrowInputFileStream::Read(int64_t nbytes) {
    ARROW_ASSIGN_OR_RAISE(auto view, PeekView(nbytes));
    file_position_ += view.size();
    return std::make_shared<ArrowInputFileStream::PageView>(std::move(view));
}

/// Advance the file position by nbytes bytes
arrow::Status ArrowInputFileStream::Advance(int64_t nbytes) {
    tmp_page_.reset();
    file_position_ += nbytes;
    return arrow::Status::OK();
}

/// Read at most nbytes bytes from the file without advancing the file position
arrow::Result<std::string_view> ArrowInputFileStream::Peek(int64_t nbytes) {
    ARROW_ASSIGN_OR_RAISE(auto view, PeekView(nbytes));
    tmp_page_ = std::move(view);
    return std::string_view{*tmp_page_};
}

}  // namespace io
}  // namespace web
}  // namespace duckdb
