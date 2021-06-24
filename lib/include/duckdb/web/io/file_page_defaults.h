#ifndef INCLUDE_DUCKDB_WEB_IO_FILE_PAGE_DEFAULTS_H
#define INCLUDE_DUCKDB_WEB_IO_FILE_PAGE_DEFAULTS_H

#include <cstddef>

namespace duckdb {
namespace web {
namespace io {

constexpr size_t DEFAULT_FILE_PAGE_CAPACITY = 100;
constexpr size_t DEFAULT_FILE_PAGE_SHIFT = 14;

}  // namespace io
}  // namespace web
}  // namespace duckdb

#endif
