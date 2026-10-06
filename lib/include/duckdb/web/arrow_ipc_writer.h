#ifndef INCLUDE_DUCKDB_WEB_ARROW_IPC_WRITER_H_
#define INCLUDE_DUCKDB_WEB_ARROW_IPC_WRITER_H_

#include <memory>
#include "duckdb/web/status.h"
#include <string>
#include <vector>

#include "duckdb/common/types.hpp"
#include "duckdb/common/types/data_chunk.hpp"
#include "duckdb/main/client_context.hpp"
#include "duckdb/web/config.h"

namespace duckdb {
namespace web {

/// Serializes query results as Arrow IPC through nanoarrow.
/// DuckDB converts chunks to Arrow C data arrays, nanoarrow encodes them as IPC messages.
/// The casts of the query config are applied on the DuckDB side before the conversion.
class ArrowIPCWriter {
   public:
    /// Constructor, prepares the Arrow schema of a result
    ArrowIPCWriter(ClientContext& context, vector<LogicalType> types, vector<string> names,
                   const QueryConfig& config, bool lossless_conversion);
    /// Destructor
    ~ArrowIPCWriter();

    /// Serialize the schema as IPC stream message
    web::Result<std::shared_ptr<web::Buffer>> SerializeSchema();
    /// Serialize a chunk as IPC record batch message, following the schema message
    web::Result<std::shared_ptr<web::Buffer>> SerializeChunk(DataChunk& chunk);
    /// Serialize a whole result as IPC stream
    web::Result<std::shared_ptr<web::Buffer>> SerializeResult(QueryResult& result);

   private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

}  // namespace web
}  // namespace duckdb

#endif
