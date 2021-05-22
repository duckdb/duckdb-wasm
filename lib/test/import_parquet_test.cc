#include <sstream>

#include "duckdb/common/types/date.hpp"
#include "duckdb/common/types/timestamp.hpp"
#include "duckdb/execution/operator/persistent/buffered_csv_reader.hpp"
#include "duckdb/web/io/ifstream.h"
#include "duckdb/web/io/memory_filesystem.h"
#include "duckdb/web/test/config.h"
#include "duckdb/web/webdb.h"
#include "gtest/gtest.h"
#include "parquet-extension.hpp"

using namespace duckdb::web;
using namespace std;

namespace {

TEST(ParquetImportTest, LoadParquet) {
    auto db = make_shared<WebDB>();
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

TEST(ParquetImportTest, LoadParquetTwice) {
    auto db = make_shared<WebDB>();
    WebDB::Connection conn{*db};
    std::stringstream ss;
    auto data = test::SOURCE_DIR / ".." / "data" / "uni" / "studenten.parquet";
    ss << "SELECT * FROM parquet_scan('" << data.string() << "');";
    auto query = ss.str();
    auto result = conn.connection().Query(query);
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
    result = conn.connection().Query(query);
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

}  // namespace
