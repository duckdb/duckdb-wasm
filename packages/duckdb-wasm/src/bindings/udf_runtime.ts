import { DuckDBRuntime } from './runtime';
import { DuckDBModule } from './duckdb_module';
import * as arrow from 'apache-arrow';

const TEXT_ENCODER = new TextEncoder();

function storeError(mod: DuckDBModule, response: number, message: string) {
    const msgBuffer = TEXT_ENCODER.encode(message);
    const heapAddr = mod._malloc(msgBuffer.byteLength);
    const heapArray = mod.HEAPU8.subarray(heapAddr, heapAddr + msgBuffer.byteLength);
    heapArray.set(msgBuffer);

    mod.HEAPF64[(response >> 3) + 0] = 1;
    mod.HEAPF64[(response >> 3) + 1] = heapAddr;
    mod.HEAPF64[(response >> 3) + 2] = heapArray.byteLength;
}

export function callScalarUDF(
    runtime: DuckDBRuntime,
    mod: DuckDBModule,
    response: number,
    funcId: number,
    bufferPtr: number,
    bufferSize: number,
) {
    try {
        // Resolve function
        const udf = runtime._udfFunctions.get(funcId);
        if (!udf) {
            storeError(mod, response, 'unknown udf with id: ' + funcId);
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

        // Create result builder
        let builder;
        switch (udf.returnType.typeId) {
            case arrow.Type.Int:
            case arrow.Type.Int32:
                builder = new arrow.Int32Builder({ type: new arrow.Int32() });
                break;
            default:
                storeError(mod, response, 'unsupported result type: ' + udf.returnType.toString());
                return;
        }

        // Collect the columns
        const columns: arrow.Vector[] = [];
        const currentRow = [];
        for (let col = 0; col < batch.numCols; ++col) {
            columns.push(batch.getChildAt(col)!);
            currentRow.push(null);
        }

        // Iterate over all rows and evaluate the udf
        for (let i = 0; i < batch.length; ++i) {
            for (let col = 0; col < batch.numCols; ++col) {
                currentRow[col] = columns[col]!.get(i) || null;
            }
            const result = udf.func(...currentRow);
            builder.append(result);
        }

        const schema = new arrow.Schema([new arrow.Field('0', new arrow.Int32(), true)]);
        const result = new arrow.RecordBatch(schema, builder.length, [builder.toVector()]);
        const resultWriter = new arrow.RecordBatchStreamWriter();
        resultWriter.write(result);
        resultWriter.finish();
        const resultBuffer = resultWriter.toUint8Array(true);

        const heapAddr = mod._malloc(resultBuffer.byteLength);
        const heapArray = mod.HEAPU8.subarray(heapAddr, heapAddr + resultBuffer.byteLength);
        heapArray.set(resultBuffer);

        mod.HEAPF64[(response >> 3) + 0] = 0;
        mod.HEAPF64[(response >> 3) + 1] = heapAddr;
        mod.HEAPF64[(response >> 3) + 2] = heapArray.byteLength;
    } catch (e: any) {
        storeError(mod, response, e.toString());
    }
}
