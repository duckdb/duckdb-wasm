#ifndef INCLUDE_DUCKDB_WEB_ARROW_BRIDGE_H_
#define INCLUDE_DUCKDB_WEB_ARROW_BRIDGE_H_

#pragma once

#include <memory>
#include <string>

#include "arrow/result.h"
#include "arrow/status.h"
#include "arrow/type_fwd.h"
#include "arrow/util/macros.h"
#include "arrow/util/visibility.h"
#include "duckdb/common/arrow/arrow_wrapper.hpp"

namespace arrow {

/// Export C++ DataType using the C data interface format.
Status ExportType(const DataType& type, struct ArrowSchema* out);
/// Export C++ Field using the C data interface format.
Status ExportField(const Field& field, struct ArrowSchema* out);
/// Export C++ Schema using the C data interface format.
Status ExportSchema(const Schema& schema, struct ArrowSchema* out);
/// Export C++ Array using the C data interface format.
Status ExportArray(const Array& array, struct ArrowArray* out, struct ArrowSchema* out_schema = NULLPTR);
/// Export C++ RecordBatch using the C data interface format.
Status ExportRecordBatch(const RecordBatch& batch, struct ArrowArray* out, struct ArrowSchema* out_schema = NULLPTR);
/// Import C++ DataType from the C data interface.
Result<std::shared_ptr<DataType>> ImportType(struct ArrowSchema* schema);
/// Import C++ Field from the C data interface.
Result<std::shared_ptr<Field>> ImportField(struct ArrowSchema* schema);
/// Import C++ Schema from the C data interface.
Result<std::shared_ptr<Schema>> ImportSchema(struct ArrowSchema* schema);
/// Import C++ array from the C data interface.
Result<std::shared_ptr<Array>> ImportArray(struct ArrowArray* array, std::shared_ptr<DataType> type);
/// Import C++ array and its type from the C data interface.
Result<std::shared_ptr<Array>> ImportArray(struct ArrowArray* array, struct ArrowSchema* type);
/// Import C++ record batch from the C data interface.
Result<std::shared_ptr<RecordBatch>> ImportRecordBatch(struct ArrowArray* array, std::shared_ptr<Schema> schema);
/// Import C++ record batch and its schema from the C data interface.
Result<std::shared_ptr<RecordBatch>> ImportRecordBatch(struct ArrowArray* array, struct ArrowSchema* schema);

/// EXPERIMENTAL: Export C++ RecordBatchReader using the C stream interface.
Status ExportRecordBatchReader(std::shared_ptr<RecordBatchReader> reader, struct ArrowArrayStream* out);
/// EXPERIMENTAL: Import C++ RecordBatchReader from the C stream interface.
Result<std::shared_ptr<RecordBatchReader>> ImportRecordBatchReader(struct ArrowArrayStream* stream);

}  // namespace arrow

#endif
