#include <filesystem>
#include <sstream>

#include "duckdb/common/types/date.hpp"
#include "duckdb/common/types/timestamp.hpp"
#include "duckdb/web/environment.h"
#include "duckdb/web/io/ifstream.h"
#include "duckdb/web/io/memory_filesystem.h"
#include "duckdb/web/test/config.h"
#include "duckdb/web/webdb.h"
#include "gtest/gtest.h"

using namespace duckdb::web;
using namespace std;

namespace {

// https://github.com/duckdb/duckdb-wasm/issues/234
TEST(Bugs, DISABLED_Decimals) {
    auto db = make_shared<WebDB>(NATIVE);
    WebDB::Connection conn{*db};
    auto buffer = conn.RunQuery("SELECT 1::DECIMAL(2,1);");
    ASSERT_TRUE(buffer.ok()) << buffer.status().message();
    buffer = conn.RunQuery("SELECT 1::DECIMAL(2,0);");
    ASSERT_TRUE(buffer.ok()) << buffer.status().message();
}

}  // namespace
