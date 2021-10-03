#include <string>

#include "arrow/ipc/reader.h"
#include "arrow/type.h"
#include "arrow/type_fwd.h"
#include "duckdb/web/arrow_stream_buffer.h"
#include "rapidjson/document.h"

namespace duckdb {
namespace web {

struct InsertOptions {
    /// The schema name
    std::string schema_name = "";
    /// The table name
    std::string table_name = "";
    /// Create new table?
    /// Insert fails when set and table exists.
    /// Insert fails when not set and table does not exist.
    bool create_new;

    /// Read from input stream
    arrow::Status ReadFrom(const rapidjson::Document& doc);
};

struct Insert {
    /// The insert id
    uint32_t insert_id;
    /// The options
    InsertOptions options;
    /// The insert calls
    size_t insert_calls;
    /// The arrow stream decoder
    std::unique_ptr<ArrowIPCStreamDecoder> arrow_stream_decoder;

    /// Constructor
    Insert(uint32_t insert_id, InsertOptions options);
    /// Read from input stream
    arrow::Status ReadFrom(const rapidjson::Document& doc);
    /// Get the arrow ipc stream
    ArrowIPCStreamDecoder& getArrowIPCStream();
};

}  // namespace web
}  // namespace duckdb
