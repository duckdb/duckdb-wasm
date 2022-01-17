import { DuckDBRuntime } from './runtime';
import { DuckDBModule } from './duckdb_module';
import * as arrow from 'apache-arrow';

export function callScalarUDF(
    _runtime: DuckDBRuntime,
    mod: DuckDBModule,
    _funcId: number,
    bufferPtr: number,
    bufferSize: number,
) {
    const buffer = mod.HEAPU8.subarray(bufferPtr, bufferPtr + bufferSize);
    const reader = arrow.RecordBatchFileReader.from(buffer);
    console.log(reader);
}
