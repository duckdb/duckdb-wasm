#include "duckdb/web/webdb.h"

#include <filesystem>
#include <sstream>

#include "duckdb/common/types/date.hpp"
#include "duckdb/common/types/timestamp.hpp"
#include "duckdb/execution/operator/persistent/buffered_csv_reader.hpp"
#include "duckdb/web/config.h"
#include "duckdb/web/io/ifstream.h"
#include "duckdb/web/io/memory_filesystem.h"
#include "duckdb/web/test/config.h"
#include "gtest/gtest.h"
#include "parquet-extension.hpp"

using namespace duckdb::web;
using namespace std;
namespace fs = std::filesystem;

namespace {

std::filesystem::path CreateTestDB() {
    static uint64_t NEXT_DB_DIR = 0;

    auto cwd = fs::current_path();
    auto tmp = cwd / ".tmp";
    auto dir = tmp / (std::string("test_db_") + std::to_string(NEXT_DB_DIR++));
    if (!fs::is_directory(tmp) || !fs::exists(tmp)) fs::create_directory(tmp);
    if (fs::exists(dir)) fs::remove_all(dir);
    fs::create_directory(dir);
    auto file = dir / "db";
    return file;
}

TEST(WebDB, NativeFeatures) {
    auto db = make_shared<WebDB>(NATIVE);
    auto features = ResolveFeatureFlags();
    ASSERT_TRUE((features & (~(1 << WebDBFeature::FAST_EXCEPTIONS))) > 0);
    ASSERT_TRUE((features & (~(1 << WebDBFeature::THREADS))) > 0);
}

TEST(WebDB, InvalidSQL) {
    auto db = make_shared<WebDB>(NATIVE);
    WebDB::Connection conn{*db};
    auto expected = conn.SendQuery(R"RAW(
        INVALID SQL
    )RAW");
    ASSERT_FALSE(expected.ok());
}

TEST(WebDB, RunQuery) {
    auto db = make_shared<WebDB>(NATIVE);
    WebDB::Connection conn{*db};
    auto buffer = conn.RunQuery("SELECT (v & 127)::TINYINT FROM generate_series(0, 2000) as t(v);");
    ASSERT_TRUE(buffer.ok()) << buffer.status().message();
}

TEST(WebDB, SendQuery) {
    auto db = make_shared<WebDB>(NATIVE);
    WebDB::Connection conn{*db};
    auto buffer = conn.SendQuery("SELECT (v & 127)::TINYINT FROM generate_series(0, 2000) as t(v);");
    ASSERT_TRUE(buffer.ok()) << buffer.status().message();
}

TEST(WebDB, PrepareQuery) {
    auto db = make_shared<WebDB>(NATIVE);
    WebDB::Connection conn{*db};
    auto stmt = conn.CreatePreparedStatement("SELECT ? + 5");
    ASSERT_TRUE(stmt.ok()) << stmt.status().message();
    auto buffer = conn.RunPreparedStatement(*stmt, "[4]");
    ASSERT_TRUE(buffer.ok()) << buffer.status().message();
    auto success = conn.ClosePreparedStatement(*stmt);
    ASSERT_TRUE(success.ok()) << success.message();
}

TEST(WebDB, Tokenize) {
    auto db = make_shared<WebDB>(NATIVE);
    ASSERT_EQ(db->Tokenize("SELECT 1"), "{\"offsets\":[0,7],\"types\":[4,1]}");
    ASSERT_EQ(db->Tokenize("SELECT * FROM region"), "{\"offsets\":[0,7,9,14],\"types\":[4,3,4,0]}");
    ASSERT_EQ(db->Tokenize("SELECT * FROM region, nation"), "{\"offsets\":[0,7,9,14,20,22],\"types\":[4,3,4,0,3,0]}");
}

}  // namespace
