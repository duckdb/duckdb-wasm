#ifndef INCLUDE_DUCKDB_WEB_ARROW_STREAM_BUFFER_H_
#define INCLUDE_DUCKDB_WEB_ARROW_STREAM_BUFFER_H_

#include <string>

#include "arrow/ipc/reader.h"
#include "arrow/record_batch.h"
#include "arrow/result.h"
#include "arrow/status.h"
#include "arrow/type.h"
#include "arrow/type_fwd.h"
#include "duckdb/common/arrow/arrow.hpp"
#include "duckdb/common/arrow/arrow_wrapper.hpp"
#include "duckdb/function/table_function.hpp"
#include "nonstd/span.h"
#include "rapidjson/document.h"

namespace duckdb {
struct ArrowStreamParameters;

namespace web {

struct ArrowIPCStreamBuffer : public arrow::ipc::Listener {
   protected:
    /// The schema
    std::shared_ptr<arrow::Schema> schema_;
    /// The batches
    std::vector<std::shared_ptr<arrow::RecordBatch>> batches_;
    /// Is eos?
    bool is_eos_;

    /// Decoded a record batch
    arrow::Status OnSchemaDecoded(std::shared_ptr<arrow::Schema> schema);
    /// Decoded a record batch
    arrow::Status OnRecordBatchDecoded(std::shared_ptr<arrow::RecordBatch> record_batch);
    /// Reached end of stream
    arrow::Status OnEOS();

   public:
    /// Constructor
    ArrowIPCStreamBuffer();

    /// Is end of stream?
    bool is_eos() const { return is_eos_; }
    /// Return the schema
    auto& schema() const { return schema_; }
    /// Return the batches
    auto& batches() const { return batches_; }
};

struct ArrowIPCStreamBufferReader : public arrow::RecordBatchReader {
   protected:
    /// The buffer
    std::shared_ptr<ArrowIPCStreamBuffer> buffer_;
    /// The batch index
    size_t next_batch_id_;

   public:
    /// Constructor
    ArrowIPCStreamBufferReader(std::shared_ptr<ArrowIPCStreamBuffer> buffer);
    /// Destructor
    ~ArrowIPCStreamBufferReader() = default;

    /// Get the schema
    std::shared_ptr<arrow::Schema> schema() const override;
    /// Read the next record batch in the stream. Return null for batch when reaching end of stream
    arrow::Status ReadNext(std::shared_ptr<arrow::RecordBatch>* batch) override;

    /// Create arrow array stream wrapper
    static duckdb::unique_ptr<duckdb::ArrowArrayStreamWrapper> CreateStream(uintptr_t buffer_ptr,
                                                                            duckdb::ArrowStreamParameters& parameters);
    /// Create arrow array stream wrapper
    static void GetSchema(uintptr_t buffer_ptr, duckdb::ArrowSchemaWrapper& schema);
};

struct BufferingArrowIPCStreamDecoder : public arrow::ipc::StreamDecoder {
   protected:
    /// The buffer
    std::shared_ptr<ArrowIPCStreamBuffer> buffer_;

   public:
    /// Constructor
    BufferingArrowIPCStreamDecoder(
        std::shared_ptr<ArrowIPCStreamBuffer> buffer = std::make_shared<ArrowIPCStreamBuffer>());
    /// Get the buffer
    auto& buffer() const { return buffer_; }
};

}  // namespace web
}  // namespace duckdb

#endif  // INCLUDE_DUCKDB_WEB_ARROW_STREAM_BUFFER_H_
