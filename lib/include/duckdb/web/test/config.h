#ifndef INCLUDE_DUCKDB_WEB_TEST_CONFIG_H_
#define INCLUDE_DUCKDB_WEB_TEST_CONFIG_H_

#include <filesystem>
#include "duckdb.hpp"

namespace duckdb {
namespace web {
namespace test {

extern std::filesystem::path SOURCE_DIR;

bool CHECK_COLUMN(MaterializedQueryResult &result, uint32_t column, vector<Value> values);

}  // namespace test
}  // namespace web
}  // namespace duckdb

#endif
