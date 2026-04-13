#ifndef INCLUDE_DUCKDB_WEB_EXPERIMENTAL_WIRE_TYPES_H_
#define INCLUDE_DUCKDB_WEB_EXPERIMENTAL_WIRE_TYPES_H_

#include <cstdint>
#include <string>
#include <vector>

namespace duckdb {
class LogicalType;
} // namespace duckdb

namespace duckdb {
namespace web {
namespace experimental {

//! How the server should cast result data before sending it over the wire.
enum class CastMode : uint8_t {
    TO_VARCHAR = 0,      //! Cast all columns to VARCHAR (default)
    TO_VARCHAR_JSON = 1, //! Cast to VARCHAR, nested/complex types as JSON strings
    NONE = 2,            //! No casting — send native types as-is
};

//! Options sent with Query/SendQuery to control server-side behavior.
struct QueryOptions {
    CastMode cast_mode = CastMode::TO_VARCHAR;
};

//! Lightweight type info for rendering — no engine dependency on client side.
struct LogicalTypeProperties {
    std::string name;
    bool is_numeric = false;
    bool is_nested = false;
    bool is_json = false;
    bool is_boolean = false;

    //! Construct from a real LogicalType (server-side only)
    static LogicalTypeProperties FromLogicalType(const duckdb::LogicalType& type);
};

struct WireResultMetadata {
    bool has_error = false;
    std::string error_message;
    std::vector<std::string> column_names;
    std::vector<LogicalTypeProperties> column_types;
    //! StatementReturnType as uint8_t
    uint8_t statement_return_type = 0;
    //! QueryResultType as uint8_t
    uint8_t query_result_type = 0;
    //! Server-reported total row count
    uint64_t row_count = 0;
    //! Server-reported chunk count (for random access)
    uint64_t chunk_count = 0;
    //! Inlined first chunk(s) from the Query response
    std::string first_chunk_blob;
    bool first_chunk_is_last = false;
};

//! Discriminator for ChunkWrapper entries inside a ChunksEnvelope.
enum class ChunkWrapperType : uint8_t {
    EMPTY_CHUNK = 0,
    REGULAR_CHUNK = 1,
    ERROR = 2,
    FAKE_CHUNK = 3,
};

struct ChunkWrapper {
    ChunkWrapperType type = ChunkWrapperType::EMPTY_CHUNK;
    std::string data;
    std::string error_data;
    bool is_last = false;
};

struct ChunksEnvelope {
    std::vector<ChunkWrapper> wrappers;

    bool Empty() const { return wrappers.empty(); }

    bool IsLast() const {
        if (wrappers.empty()) return false;
        auto& back = wrappers.back();
        return back.type == ChunkWrapperType::FAKE_CHUNK && back.is_last;
    }
};

}  // namespace experimental
}  // namespace web
}  // namespace duckdb

#endif  // INCLUDE_DUCKDB_WEB_EXPERIMENTAL_WIRE_TYPES_H_
