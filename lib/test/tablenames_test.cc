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
#include "parquet_extension.hpp"

using namespace duckdb::web;
using namespace std;

namespace {

TEST(TableNames, Cases) {
    WebDB db{NATIVE};
    WebDB::Connection conn{db};

    // Standard
    auto table_names = conn.GetTableNames("SELECT * FROM my_table");
    ASSERT_TRUE(table_names.ok());
    ASSERT_EQ(table_names.ValueUnsafe(), "[\"my_table\"]");

    // Fetch specific
    table_names = conn.GetTableNames("SELECT col_a FROM my_table");
    ASSERT_TRUE(table_names.ok());
    ASSERT_EQ(table_names.ValueUnsafe(), "[\"my_table\"]");

    // Multiple tables
    table_names = conn.GetTableNames("SELECT * FROM my_table1, my_table2, my_table3");
    ASSERT_TRUE(table_names.ok());
    ASSERT_EQ(table_names.ValueUnsafe(), "[\"my_table1\",\"my_table2\",\"my_table3\"]");

    // SameTableMultipleTimes
    table_names = conn.GetTableNames("SELECT col_a FROM my_table, my_table m2, my_table m3");
    ASSERT_TRUE(table_names.ok());
    ASSERT_EQ(table_names.ValueUnsafe(), "[\"my_table\"]");

    // CTE
    table_names = conn.GetTableNames("WITH cte AS (SELECT * FROM my_table) SELECT * FROM cte");
    ASSERT_TRUE(table_names.ok());
    ASSERT_EQ(table_names.ValueUnsafe(), "[\"my_table\"]");

    // SubQueries
    table_names = conn.GetTableNames("SELECT * FROM (SELECT * FROM (SELECT * FROM my_table) bla) bla3");
    ASSERT_TRUE(table_names.ok());
    ASSERT_EQ(table_names.ValueUnsafe(), "[\"my_table\"]");

    // Join
    table_names = conn.GetTableNames("SELECT col_a FROM my_table JOIN my_table2 ON (my_table.col_b=my_table2.col_d)");
    ASSERT_TRUE(table_names.ok());
    ASSERT_EQ(table_names.ValueUnsafe(), "[\"my_table\",\"my_table2\"]");

    // Scalar Subquery
    table_names = conn.GetTableNames("SELECT (SELECT COUNT(*) FROM my_table)");
    ASSERT_TRUE(table_names.ok());
    ASSERT_EQ(table_names.ValueUnsafe(), "[\"my_table\"]");

    // Set Operations
    table_names = conn.GetTableNames(
        "SELECT * FROM my_table UNION ALL SELECT * FROM my_table2 INTERSECT SELECT * FROM my_table3");
    ASSERT_TRUE(table_names.ok());
    ASSERT_EQ(table_names.ValueUnsafe(), "[\"my_table\",\"my_table2\",\"my_table3\"]");

    // Window Functions
    table_names = conn.GetTableNames("SELECT row_number() OVER (ORDER BY (SELECT i+j FROM my_table2)) FROM my_table");
    ASSERT_TRUE(table_names.ok());
    ASSERT_EQ(table_names.ValueUnsafe(), "[\"my_table\",\"my_table2\"]");
}

}  // namespace
