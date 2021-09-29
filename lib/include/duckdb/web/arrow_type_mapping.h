#ifndef INCLUDE_DUCKDB_WEB_ARROW_TYPE_MAPPING_H_
#define INCLUDE_DUCKDB_WEB_ARROW_TYPE_MAPPING_H_

#include <cstdint>

#include "arrow/type_fwd.h"
#include "duckdb/common/types.hpp"

namespace duckdb {
namespace web {

/// Map arrow type
arrow::Result<duckdb::LogicalType> mapArrowType(const arrow::DataType& type);

}  // namespace web
}  // namespace duckdb

#endif
