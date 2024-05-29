#include "duckdb/web/functions/table_function_relation.h"

#include "duckdb/main/client_context.hpp"
#include "duckdb/parser/expression/columnref_expression.hpp"
#include "duckdb/parser/expression/comparison_expression.hpp"
#include "duckdb/parser/expression/constant_expression.hpp"
#include "duckdb/parser/expression/function_expression.hpp"
#include "duckdb/parser/expression/star_expression.hpp"
#include "duckdb/parser/expression/subquery_expression.hpp"
#include "duckdb/parser/query_node/select_node.hpp"
#include "duckdb/parser/tableref/basetableref.hpp"
#include "duckdb/parser/tableref/table_function_ref.hpp"

namespace duckdb {
namespace web {

TableFunctionRelation::TableFunctionRelation(const duckdb::shared_ptr<ClientContext> &context, string name,
                                             vector<Value> unnamed_parameters,
                                             unordered_map<string, Value> named_parameters,
                                             shared_ptr<Relation> input_relation_p)
    : Relation(context, RelationType::TABLE_FUNCTION_RELATION),
      name(std::move(name)),
      unnamed_parameters(std::move(unnamed_parameters)),
      named_parameters(std::move(named_parameters)),
      input_relation(std::move(input_relation_p)) {
    context->TryBindRelation(*this, this->columns);
}

unique_ptr<QueryNode> TableFunctionRelation::GetQueryNode() {
    auto result = std::make_unique<SelectNode>();
    result->select_list.push_back(std::make_unique<StarExpression>());
    result->from_table = GetTableRef();
    return std::move(result);
}

unique_ptr<TableRef> TableFunctionRelation::GetTableRef() {
    vector<unique_ptr<ParsedExpression>> children;
    if (input_relation) {  // input relation becomes first parameter if present, always
        auto subquery = std::make_unique<duckdb::SubqueryExpression>();
        subquery->subquery = duckdb::make_uniq<duckdb::SelectStatement>();
        subquery->subquery->node = input_relation->GetQueryNode();
        subquery->subquery_type = SubqueryType::SCALAR;
        children.push_back(std::move(subquery));
    }
    for (auto &parameter : unnamed_parameters) {
        children.push_back(std::make_unique<ConstantExpression>(parameter));
    }
    for (auto &[k, v] : named_parameters) {
        auto l = duckdb::make_uniq<ColumnRefExpression>(k);
        auto r = duckdb::make_uniq<ConstantExpression>(v);
        auto eq = duckdb::make_uniq<ComparisonExpression>(ExpressionType::COMPARE_EQUAL, std::move(l), std::move(r));
        children.push_back(std::move(eq));
    }
    auto table_function = std::make_unique<TableFunctionRef>();
    auto function = duckdb::make_uniq<FunctionExpression>(name, std::move(children));
    table_function->function = std::move(function);
    return std::move(table_function);
}

string TableFunctionRelation::GetAlias() { return name; }

const vector<ColumnDefinition> &TableFunctionRelation::Columns() { return columns; }

string TableFunctionRelation::ToString(idx_t depth) {
    string function_call = name + "(";
    idx_t i = 0;
    for (; i < unnamed_parameters.size(); i++) {
        if (i > 0) {
            function_call += ", ";
        }
        function_call += unnamed_parameters[i].ToString();
    }
    for (auto &[k, v] : named_parameters) {
        if (i > 0) {
            function_call += ", ";
        }
        function_call += k;
        function_call += " = ";
        function_call += v.ToString();
    }
    function_call += ")";
    return RenderWhitespace(depth) + function_call;
}

}  // namespace web
}  // namespace duckdb
