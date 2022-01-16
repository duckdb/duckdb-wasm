import { DuckDBRuntime } from './runtime';
import { DuckDBModule } from './duckdb_module';

export function callScalarUDF(
    _runtime: DuckDBRuntime,
    _mod: DuckDBModule,
    _funcId: number,
    _bufferPtr: number,
    _bufferSize: number,
) {}
