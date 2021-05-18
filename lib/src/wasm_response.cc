#include "duckdb/web/wasm_response.h"

#include <cstdint>

#include "arrow/buffer.h"

namespace duckdb {
namespace web {

WASMResponseBuffer::WASMResponseBuffer() : status_message_(), result_str_(), result_arrow_() {}

void WASMResponseBuffer::Clear() {
    result_str_ = "";
    result_arrow_.reset();
}

bool WASMResponseBuffer::Store(WASMResponse& response, arrow::Status status) {
    Clear();
    response.statusCode = static_cast<uint64_t>(status.code());
    if (!status.ok()) {
        status_message_ = status.message();
        response.dataOrValue = reinterpret_cast<uintptr_t>(status_message_.data());
        response.dataSize = reinterpret_cast<uintptr_t>(status_message_.size());
        return false;
    }
    return true;
}

void WASMResponseBuffer::Store(WASMResponse& response, std::string_view value) {
    response.statusCode = 0;
    response.dataOrValue = reinterpret_cast<uintptr_t>(value.data());
    response.dataSize = value.size();
}

void WASMResponseBuffer::Store(WASMResponse& response, arrow::Result<std::shared_ptr<arrow::Buffer>> result) {
    if (!Store(response, result.status())) return;
    result_arrow_ = std::move(result.ValueUnsafe());
    response.dataOrValue = reinterpret_cast<uintptr_t>(result_arrow_->data());
    response.dataSize = result_arrow_->size();
}

void WASMResponseBuffer::Store(WASMResponse& response, arrow::Result<std::string> result) {
    if (!Store(response, result.status())) return;
    result_str_ = std::move(result.ValueUnsafe());
    response.dataOrValue = reinterpret_cast<uintptr_t>(result_str_.data());
    response.dataSize = reinterpret_cast<uintptr_t>(result_str_.size());
}

void WASMResponseBuffer::Store(WASMResponse& response, arrow::Result<double> result) {
    if (!Store(response, result.status())) return;
    response.dataOrValue = result.ValueUnsafe();
    response.dataSize = 0;
}

void WASMResponseBuffer::Store(WASMResponse& response, arrow::Result<size_t> result) {
    if (!Store(response, result.status())) return;
    response.dataOrValue = result.ValueUnsafe();
    response.dataSize = 0;
}

/// Get the instance
WASMResponseBuffer& WASMResponseBuffer::GetInstance() {
    static WASMResponseBuffer buffer;
    return buffer;
}

}  // namespace web
}  // namespace duckdb
