#include <memory>

#include "duckdb/common/constants.hpp"
#include "duckdb/common/file_system.hpp"
#include "duckdb/web/io/web_filesystem.h"

namespace duckdb {
namespace web {
namespace io {

/// Create the default filesystem depending on the platform
std::unique_ptr<duckdb::FileSystem> CreateDefaultFileSystem() {
#ifdef EMSCRIPTEN
    return std::make_unique<WebFileSystem>();
#else
    return std::make_unique<duckdb::FileSystem>();
#endif
}

}  // namespace io
}  // namespace web
}  // namespace duckdb
