import { DuckDBRuntime } from './runtime';
import { DuckDBModule } from './duckdb_module';
import * as arrow from 'apache-arrow';

export function callScalarUDF(
    runtime: DuckDBRuntime,
    mod: DuckDBModule,
    _response: number,
    funcId: number,
    bufferPtr: number,
    bufferSize: number,
) {
    // Resolve function
    const udf = runtime._udfFunctions.get(funcId);
    if (!udf) {
        console.log('missing function');
        // XXX Return error
        return;
    }

    // Read record batch
    const buffer = mod.HEAPU8.subarray(bufferPtr, bufferPtr + bufferSize);
    const reader = arrow.RecordBatchFileReader.from(buffer);
    reader.open();
    const next = reader.next();
    if (next.done) {
        return;
    }
    const batch = next.value;

    // Iterate over all rows
    const columns = [];
    const currentRow = [];
    for (let col = 0; col < batch.numCols; ++col) {
        columns.push(batch.getChildAt(col));
        currentRow.push(null);
    }
    for (let i = 0; i < batch.length; ++i) {
        for (let col = 0; col < batch.numCols; ++col) {
            currentRow[col] = columns[col]!.get(i) || null;
        }
        console.log(currentRow);
        const result = udf.func(...currentRow);
        console.log(result);
    }
}
