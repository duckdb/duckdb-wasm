#include <filesystem>
#include <sstream>

#include "duckdb/common/types/date.hpp"
#include "duckdb/common/types/timestamp.hpp"
#include "duckdb/execution/operator/persistent/buffered_csv_reader.hpp"
#include "duckdb/web/extensions/parquet_extension.h"
#include "duckdb/web/io/ifstream.h"
#include "duckdb/web/io/memory_filesystem.h"
#include "duckdb/web/test/config.h"
#include "duckdb/web/webdb.h"
#include "gtest/gtest.h"

using namespace duckdb::web;
using namespace std;
namespace fs = std::filesystem;

namespace {

TEST(WebFileSystemTest, LoadParquet) {
    auto db = std::make_shared<WebDB>(WEB);
    duckdb_web_parquet_init(&db->database());
    WebDB::Connection conn{*db};
    std::stringstream ss;
    auto data = test::SOURCE_DIR / ".." / "data" / "uni" / "studenten.parquet";
    ss << "SELECT * FROM parquet_scan('" << data.string() << "');";
    auto result = conn.connection().Query(ss.str());
    ASSERT_STREQ(result->ToString().c_str(),
                 R"TXT(matrnr	name	semester	
INTEGER	VARCHAR	INTEGER	
[ Rows: 8]
24002	Xenokrates	18	
25403	Jonas	12	
26120	Fichte	10	
26830	Aristoxenos	8	
27550	Schopenhauer	6	
28106	Carnap	3	
29120	Theophrastos	2	
29555	Feuerbach	2	

)TXT");
}

TEST(WebFileSystemTest, TestTPCHScans) {
    auto db = std::make_shared<WebDB>(WEB);
    duckdb_web_parquet_init(&db->database());
    WebDB::Connection conn{*db};
    std::string files[] = {"customer", "lineitem", "nation", "orders", "partsupp", "part", "region", "supplier"};
    for (const auto& f : files) {
        std::stringstream ss;
        auto data = test::SOURCE_DIR / ".." / "data" / "tpch" / "0_01" / "parquet" / (f + ".parquet");
        if (!fs::exists(data)) GTEST_SKIP_(": Missing SF 0.01 TPCH files");

        ss << "SELECT * FROM parquet_scan('" << data.string() << "')";
        auto stream = conn.connection().SendQuery(ss.str());
        ASSERT_TRUE(stream->error.empty()) << stream->error;
        for (auto chunk = stream->Fetch(); !!chunk && chunk->size(); chunk = stream->Fetch())
            ;
    }
}

TEST(WebFileSystemTest, TestExport) {
    auto db = std::make_shared<WebDB>(WEB);
    WebDB::Connection conn{*db};
    auto result = conn.RunQuery("CREATE TABLE foo AS (SELECT * FROM generate_series(1, 100) t(v))");
    ASSERT_TRUE(result.ok()) << result.status().message();
    result = conn.RunQuery("EXPORT DATABASE '/tmp/duckdbexport'");
    ASSERT_TRUE(result.ok()) << result.status().message();
}

}  // namespace
