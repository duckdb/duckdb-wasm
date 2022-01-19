#include "duckdb/common/enums/expression_type.hpp"
#include "duckdb/common/enums/statement_type.hpp"
#include "duckdb/common/enums/tableref_type.hpp"
#include "duckdb/common/types.hpp"
#include "duckdb/common/types/string_type.hpp"
#include "duckdb/function/table_function.hpp"
#include "duckdb/parser/expression/constant_expression.hpp"
#include "duckdb/parser/expression/function_expression.hpp"
#include "duckdb/parser/parser.hpp"
#include "duckdb/parser/query_node.hpp"
#include "duckdb/parser/query_node/select_node.hpp"
#include "duckdb/parser/statement/select_statement.hpp"
#include "duckdb/parser/tableref/table_function_ref.hpp"
#include "duckdb/web/arrow_casts.h"
#include "gtest/gtest.h"

using namespace duckdb::web;

namespace {

TEST(ASTIntrospection, SingleRemote) {
    duckdb::Parser parser;
    parser.ParseQuery("SELECT * FROM parquet_scan('http://foo')");

    // Make sure there is a statement
    ASSERT_EQ(parser.statements.size(), 1);

    // ... get first statement
    auto& stmt = *parser.statements[0];
    ASSERT_EQ(stmt.type, duckdb::StatementType::SELECT_STATEMENT);
    auto select_stmt = reinterpret_cast<duckdb::SelectStatement*>(&stmt);

    // ... select statements have a query node
    auto& query_node = *select_stmt->node;
    ASSERT_EQ(query_node.type, duckdb::QueryNodeType::SELECT_NODE);

    // ... in our case, it's actually a select node
    auto& select_node = *reinterpret_cast<duckdb::SelectNode*>(&query_node);

    // ... with a table function in the from clause
    ASSERT_TRUE(select_node.from_table != nullptr);
    ASSERT_EQ(select_node.from_table->type, duckdb::TableReferenceType::TABLE_FUNCTION);
    auto& from = *reinterpret_cast<duckdb::TableFunctionRef*>(select_node.from_table.get());

    // Unpack the table function
    ASSERT_EQ(from.function->ToString(), "parquet_scan(http://foo)");
    ASSERT_EQ(from.function->type, duckdb::ExpressionType::FUNCTION);
    auto& func = *reinterpret_cast<duckdb::FunctionExpression*>(from.function.get());
    ASSERT_EQ(func.function_name, "parquet_scan");

    // Get the first function argument
    ASSERT_EQ(func.children.size(), 1);

    // .. which is a constant value
    ASSERT_EQ(func.children[0]->type, duckdb::ExpressionType::VALUE_CONSTANT);
    auto& constant = *reinterpret_cast<duckdb::ConstantExpression*>(func.children[0].get());
    ASSERT_EQ(constant.ToString(), "http://foo");
    ASSERT_EQ(constant.value.type().id(), duckdb::LogicalTypeId::VARCHAR);
    ASSERT_EQ(constant.value.ToString(), "http://foo");

    // ... that can be unpacked as std string
    ASSERT_EQ(constant.value.GetValue<std::string>(), "http://foo");
}

}  // namespace
