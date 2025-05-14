#ifndef INCLUDE_DUCKDB_WEB_UTILS_WASM_RESPONSE_H_
#define INCLUDE_DUCKDB_WEB_UTILS_WASM_RESPONSE_H_

#include "arrow/io/buffered.h"
#include "arrow/io/interfaces.h"
#include "arrow/ipc/writer.h"

namespace duckdb {
namespace web {

struct DuckDBWasmResultsWrapper;

struct WASMResponse {
    /// The status code
    double statusCode = 1;
    /// The data ptr of value (if any)
    double dataOrValue = 0;
    /// The data size
    double dataSize = 0;
} __attribute((packed));

class WASMResponseBuffer {
   protected:
    /// The status message
    std::string status_message_;
    /// The string result buffer (if any)
    std::string result_str_;
    /// The arrow result buffer (if any)
    std::shared_ptr<arrow::Buffer> result_arrow_;

   public:
    /// Constructor
    WASMResponseBuffer();

    /// Clear the response buffer
    void Clear();
    /// Store the arrow status.
    /// Returns wheather the result was OK
    bool Store(WASMResponse& response, arrow::Status status);
    /// Store a DuckDBWasmResultsWrapper
    void Store(WASMResponse& response, DuckDBWasmResultsWrapper& value);
    /// Store a string
    void Store(WASMResponse& response, std::string value);
    /// Store a string view
    void Store(WASMResponse& response, std::string_view value);
    /// Store the result buffer
    void Store(WASMResponse& response, arrow::Result<std::shared_ptr<arrow::Buffer>> result);
    /// Store the result string
    void Store(WASMResponse& response, arrow::Result<std::string> result);
    /// Store the result double
    void Store(WASMResponse& response, arrow::Result<double> result);
    /// Store the result size_t
    void Store(WASMResponse& response, arrow::Result<size_t> result);

    /// Get the instance
    static WASMResponseBuffer& Get();
};

}  // namespace web
}  // namespace duckdb

#endif  // INCLUDE_DUCKDB_WEB_WASM_RESPONSE_H_
