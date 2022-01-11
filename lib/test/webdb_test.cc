#include "duckdb/web/webdb.h"
#include <filesystem>
#include "duckdb/common/types/timestamp.hpp"
#include "duckdb/web/config.h"
#include "duckdb/web/io/web_filesystem.h"
#include "gtest/gtest.h"

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

TEST(WebDB, S3ConfigParameters) {
    auto db = make_shared<WebDB>(WEB);
    WebDB::Connection conn{*db};
    auto web_fs = io::WebFileSystem::Get();
    auto web_fs_config = web_fs->Config();

    ASSERT_STREQ(web_fs_config->filesystem.s3_region.c_str(), "");
    ASSERT_STREQ(web_fs_config->filesystem.s3_endpoint.c_str(), "");
    ASSERT_STREQ(web_fs_config->filesystem.s3_access_key_id.c_str(), "");
    ASSERT_STREQ(web_fs_config->filesystem.s3_secret_access_key.c_str(), "");
    ASSERT_STREQ(web_fs_config->filesystem.s3_session_token.c_str(), "");

    conn.connection().Query("SET s3_region='my-favorite-s3-region'");
    conn.connection().Query("SET s3_endpoint='amazon'");
    conn.connection().Query("SET s3_access_key_id='my-little-access-key-id'");
    conn.connection().Query("SET s3_secret_access_key='very-secret-key'");
    conn.connection().Query("SET s3_session_token='some-session-token'");

    ASSERT_STREQ(web_fs_config->filesystem.s3_region.c_str(), "my-favorite-s3-region");
    ASSERT_STREQ(web_fs_config->filesystem.s3_endpoint.c_str(), "amazon");
    ASSERT_STREQ(web_fs_config->filesystem.s3_access_key_id.c_str(), "my-little-access-key-id");
    ASSERT_STREQ(web_fs_config->filesystem.s3_secret_access_key.c_str(), "very-secret-key");
    ASSERT_STREQ(web_fs_config->filesystem.s3_session_token.c_str(), "some-session-token");
}

TEST(WebDB, ExtensionOptions) {
    auto db = make_shared<WebDB>(WEB);
    WebDB::Connection conn{*db};
    auto web_fs = io::WebFileSystem::Get();
    auto web_fs_config = web_fs->Config();

    // Reset region in case other tests have run before this setting it
    conn.connection().Query("SET s3_region=''");

    // Query with cache epoch 0 returns some information with the current cache epoch attached
    auto json_str = db->GetFileInfo("https://some.bucket.s3.amazonaws.com", 0).ValueOrDie();
    rapidjson::Document doc;
    rapidjson::ParseResult ok = doc.Parse(json_str.c_str());
    ASSERT_TRUE(ok);
    ASSERT_TRUE(doc.HasMember("cacheEpoch"));
    ASSERT_TRUE(doc["cacheEpoch"].IsInt());
    auto current_epoch = doc["cacheEpoch"].GetInt();

    // Same query with current epoch will return empty string
    ASSERT_STREQ(db->GetFileInfo("https://some.bucket.s3.amazonaws.com", current_epoch).ValueOrDie().c_str(), "");

    // Setting extension option through DuckDB
    conn.connection().Query("SET s3_region='my-favorite-s3-region'");

    // web_fs_config should be updated
    ASSERT_STREQ(web_fs_config->filesystem.s3_region.c_str(), "my-favorite-s3-region");

    // GetFileInfo with old epoch should now return updated config with
    json_str = db->GetFileInfo("https://some.bucket.s3.amazonaws.com", current_epoch).ValueOrDie();
    rapidjson::Document doc2;
    rapidjson::ParseResult ok2 = doc2.Parse(json_str.c_str());
    ASSERT_TRUE(ok2);

    // Epoch should be updated by 1
    ASSERT_TRUE(doc2.HasMember("cacheEpoch"));
    ASSERT_EQ(doc2["cacheEpoch"].GetInt(), current_epoch + 1);

    // Adding 1 to the epoch should return empty response
    ASSERT_STREQ(db->GetFileInfo("https://some.bucket.s3.amazonaws.com", current_epoch + 1).ValueOrDie().c_str(), "");
}

TEST(WebDB, GlobalFileInfo) {
    auto db = make_shared<WebDB>(WEB);
    WebDB::Connection conn{*db};

    auto json_str = db->GetGlobalFileInfo(0).ValueOrDie();
    rapidjson::Document doc;
    rapidjson::ParseResult ok = doc.Parse(json_str.c_str());
    ASSERT_TRUE(ok);
    ASSERT_TRUE(doc.HasMember("cacheEpoch"));
    ASSERT_TRUE(doc.HasMember("allowFullHttpReads"));
    ASSERT_TRUE(doc.HasMember("s3Config"));

    // Same call with current epoch returns empty string
    ASSERT_TRUE(doc["cacheEpoch"].IsInt());
    auto current_epoch = doc["cacheEpoch"].GetInt();
    ASSERT_STREQ(db->GetGlobalFileInfo(current_epoch).ValueOrDie().c_str(), "");
}
}  // namespace
