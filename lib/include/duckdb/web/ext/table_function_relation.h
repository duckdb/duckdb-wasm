#include <duckdb/common/unordered_map.hpp>
#include <unordered_map>

#include "duckdb/main/relation.hpp"

namespace duckdb {
namespace web {

class TableFunctionRelation : public Relation {
   public:
    TableFunctionRelation(ClientContext &context, string name, vector<Value> unnamed_parameters,
                          unordered_map<string, Value> named_parameters,
                          shared_ptr<Relation> input_relation_p = nullptr);

    string name;
    vector<Value> unnamed_parameters;
    unordered_map<string, Value> named_parameters;
    vector<ColumnDefinition> columns;
    shared_ptr<Relation> input_relation;

   public:
    unique_ptr<QueryNode> GetQueryNode() override;
    unique_ptr<TableRef> GetTableRef() override;

    const vector<ColumnDefinition> &Columns() override;
    string ToString(idx_t depth) override;
    string GetAlias() override;
};

}  // namespace web
}  // namespace duckdb
