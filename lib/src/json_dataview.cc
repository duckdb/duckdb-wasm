#include "duckdb/web/json_dataview.h"

#include <arrow/result.h>

#include <algorithm>
#include <cstdint>
#include <duckdb/common/types.hpp>
#include <duckdb/common/types/vector.hpp>
#include <iostream>
#include <memory>
#include <optional>
#include <string_view>
#include <unordered_map>
#include <unordered_set>
#include <variant>
#include <vector>

#include "arrow/status.h"
#include "arrow/type.h"
#include "arrow/type_fwd.h"
#include "arrow/type_traits.h"
#include "arrow/util/value_parsing.h"
#include "duckdb/common/string_util.hpp"
#include "duckdb/web/json_parser.h"
#include "duckdb/web/json_typedef.h"
#include "rapidjson/document.h"
#include "rapidjson/istreamwrapper.h"
#include "rapidjson/rapidjson.h"
#include "rapidjson/writer.h"

using namespace arrow;

namespace duckdb {
namespace web {
namespace json {

namespace {

template <typename T>
std::pair<T*, size_t> create_additional_buffer(std::vector<double>& data_ptrs, additional_buffers_t& additional_buffers,
                                               idx_t size) {
    additional_buffers.emplace_back(unique_ptr<data_t[]>(new data_t[size]));
    auto res_ptr = reinterpret_cast<T*>(additional_buffers.back().get());
    data_ptrs.push_back(static_cast<double>(reinterpret_cast<uintptr_t>(res_ptr)));
    return {res_ptr, data_ptrs.size() - 1};
}

}  // namespace

/// Serialize a DuckDB Vector as JSON data view
arrow::Result<rapidjson::Value> CreateDataView(rapidjson::Document& doc, duckdb::DataChunk& chunk,
                                               std::vector<double>& data_ptrs,
                                               additional_buffers_t& additional_buffers) {
    auto allocator = doc.GetAllocator();

    // TODO create the descriptor in the bind phase for performance
    // TODO special handling if all arguments are non-NULL for performance

    // Make sure we only have flat vectors hereafter (for now)
    chunk.Flatten();
    rapidjson::Value col_descs{rapidjson::kArrayType};
    for (idx_t col_idx = 0; col_idx < chunk.ColumnCount(); col_idx++) {
        rapidjson::Value col_desc;

        auto& chunk_vec = chunk.data[col_idx];

        // Do a post-order DFS traversal
        std::vector<std::tuple<bool, duckdb::Vector*, rapidjson::Value, size_t>> pending;
        pending.push_back({false, &chunk_vec, rapidjson::Value(rapidjson::kObjectType), 0});

        while (!pending.empty()) {
            // Already visited?
            auto& [visited, vec, desc, parent_idx] = pending.back();
            if (visited) {
                if (pending.size() == 1) {
                    col_desc = std::move(desc);
                    break;
                }
                std::get<2>(pending[parent_idx])["children"].PushBack(std::move(desc), allocator);
                pending.pop_back();
                continue;
            }
            visited = true;
            auto current_idx = pending.size() - 1;

            // Store logical and physical types
            auto& vec_type = vec->GetType();
            desc.AddMember("sqlType", vec_type.ToString(), allocator);
            desc.AddMember("physicalType", TypeIdToString(vec_type.InternalType()), allocator);

            // Create validity vector
            vec->Flatten(chunk.size());
            auto& validity = FlatVector::Validity(*vec);
            auto [validity_ptr, validity_idx] =
                create_additional_buffer<uint8_t>(data_ptrs, additional_buffers, chunk.size());
            for (idx_t row_idx = 0; row_idx < chunk.size(); row_idx++) {
                validity_ptr[row_idx] = validity.RowIsValid(row_idx);
            }
            desc.AddMember("validityBuffer", rapidjson::Value{static_cast<uint64_t>(validity_idx)}, allocator);

            // Create js-compatible buffers for supported types.
            // Very simple for primitive types, bit more involved for strings etc.
            switch (vec_type.id()) {
                case LogicalTypeId::INTEGER:
                case LogicalTypeId::DOUBLE:
                    data_ptrs.push_back(static_cast<double>(reinterpret_cast<uintptr_t>(vec->GetData())));
                    desc.AddMember("dataBuffer", rapidjson::Value{static_cast<uint64_t>(data_ptrs.size() - 1)},
                                   allocator);
                    break;
                case LogicalTypeId::BLOB:
                case LogicalTypeId::VARCHAR: {
                    auto [data_ptr, data_idx] =
                        create_additional_buffer<double>(data_ptrs, additional_buffers, chunk.size() * sizeof(double));
                    auto [len_ptr, length_idx] =
                        create_additional_buffer<double>(data_ptrs, additional_buffers, chunk.size() * sizeof(double));

                    auto string_ptr = FlatVector::GetData<string_t>(*vec);
                    for (idx_t row_idx = 0; row_idx < chunk.size(); row_idx++) {
                        data_ptr[row_idx] =
                            static_cast<double>(reinterpret_cast<ptrdiff_t>(string_ptr[row_idx].GetDataUnsafe()));
                        len_ptr[row_idx] = static_cast<double>(string_ptr[row_idx].GetSize());
                    }
                    desc.AddMember("dataBuffer", rapidjson::Value{static_cast<uint64_t>(data_idx)}, allocator);
                    desc.AddMember("lengthBuffer", rapidjson::Value{static_cast<uint64_t>(length_idx)}, allocator);
                    break;
                }
                case LogicalTypeId::STRUCT: {
                    auto child_count = StructType::GetChildCount(vec_type);
                    auto& entries = StructVector::GetEntries(*vec);
                    desc.AddMember("children", rapidjson::Value(rapidjson::kArrayType), allocator);
                    for (size_t i = 0; i < child_count; ++i) {
                        auto c = child_count - 1 - i;
                        auto& entry = entries[c];
                        rapidjson::Value desc{rapidjson::kObjectType};
                        auto name = StructType::GetChildName(vec_type, c);
                        desc.AddMember("name", rapidjson::Value{name, allocator}, allocator);
                        pending.push_back({false, entry.get(), std::move(desc), current_idx});
                    }
                    break;
                }
                default:
                    return arrow::Status::ExecutionError("Unsupported UDF argument type " + vec->GetType().ToString());
            }
        }
        col_descs.PushBack(std::move(col_desc), allocator);
    }
    return col_descs;
}

}  // namespace json
}  // namespace web
}  // namespace duckdb
