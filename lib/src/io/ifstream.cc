#include "duckdb/web/io/ifstream.h"

#include <cstring>

namespace duckdb {
namespace web {
namespace io {

bool InputFileStreamBuffer::NextPage() {
    auto page_id = next_page_id_++;
    if ((page_id << file_page_buffer_->GetPageSizeShift()) >= data_end_) return false;
    buffer_.Release();
    buffer_ = file_->FixPage(page_id, false);
    auto data = buffer_.GetData();
    auto data_offset = page_id << file_page_buffer_->GetPageSizeShift();
    assert(data_offset < data_end_);
    auto data_size = std::min<uint64_t>(data.size(), data_end_ - data_offset);
    setg(data.data(), data.data(), data.data() + data_size);
    return true;
}

std::streamsize InputFileStreamBuffer::xsgetn(char* out, std::streamsize want) {
    auto base = out;
    auto left = std::min<uint64_t>(want, file_->GetSize() - GetPosition());
    assert((egptr() - gptr()) <= (file_->GetSize() - GetPosition()));
    while (left > 0 && (gptr() < egptr() || NextPage())) {
        auto m = std::min<uint64_t>(egptr() - gptr(), left);
        std::memcpy(out, gptr(), m);
        gbump(m);
        out += m;
        left -= m;
    }
    return out - base;
}

InputFileStreamBuffer::pos_type InputFileStreamBuffer::seekoff(off_type n, std::ios_base::seekdir dir,
                                                               std::ios_base::openmode) {
    uint64_t pos;
    if (dir == std::ios_base::beg) {
        pos = n;
    } else if (dir == std::ios_base::end) {
        pos = file_->GetSize() - n;
    } else {
        pos = std::min<uint64_t>(file_->GetSize(), pos + n);
    }
    auto page_id = pos >> file_page_buffer_->GetPageSizeShift();
    auto page_ofs = pos - (page_id << file_page_buffer_->GetPageSizeShift());
    next_page_id_ = page_id;
    NextPage();
    gbump(page_ofs);
    return pos;
}

InputFileStreamBuffer::pos_type InputFileStreamBuffer::seekpos(pos_type p, std::ios_base::openmode) {
    auto page_id = p >> file_page_buffer_->GetPageSizeShift();
    auto page_ofs = p - (page_id << file_page_buffer_->GetPageSizeShift());
    next_page_id_ = page_id;
    NextPage();
    gbump(page_ofs);
    return p;
}

void InputFileStreamBuffer::Slice(uint64_t offset, uint64_t size) {
    // Determine range
    auto file_size = file_->GetSize();
    auto begin = std::min(file_size, offset);
    auto max_size = file_size - begin;
    auto end = begin + ((size == 0) ? max_size : std::min(max_size, size));

    // Load next page
    auto page_id = begin >> file_page_buffer_->GetPageSizeShift();
    auto page_ofs = begin - (page_id << file_page_buffer_->GetPageSizeShift());
    assert(page_ofs < file_page_buffer_->GetPageSize());
    next_page_id_ = page_id;
    data_end_ = end;
    NextPage();
    gbump(page_ofs);
}

}  // namespace io
}  // namespace web
}  // namespace duckdb
