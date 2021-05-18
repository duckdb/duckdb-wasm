#ifndef INCLUDE_DUCKDB_WEB_IO_DEFAULT_FILESYSTEM_H_
#define INCLUDE_DUCKDB_WEB_IO_DEFAULT_FILESYSTEM_H_

#include "duckdb/common/constants.hpp"
#include "duckdb/common/file_system.hpp"

namespace duckdb {
namespace web {
namespace io {

/// Create the default filesystem depending on the platform
std::unique_ptr<duckdb::FileSystem> CreateDefaultFileSystem();

}  // namespace io
}  // namespace web
}  // namespace duckdb

#endif  // INCLUDE_DUCKDB_WEB_IO_DEFAULT_FILESYSTEM_H_
