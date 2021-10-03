#include "duckdb/web/insert.h"

#include <iostream>
#include <memory>
#include <sstream>
#include <string>

namespace duckdb {
namespace web {

/// Get the arrow ipc stream
ArrowIPCStreamDecoder& Insert::getArrowIPCStream() {
    if (!arrow_stream_decoder) {
        arrow_stream_decoder = std::make_unique<ArrowIPCStreamDecoder>();
    }
    return *arrow_stream_decoder;
}

}  // namespace web
}  // namespace duckdb
