import { DuckDBRuntime } from './runtime';
import { DuckDBModule } from './duckdb_module';
export declare function callScalarUDF(runtime: DuckDBRuntime, mod: DuckDBModule, response: number, funcId: number, descPtr: number, descSize: number, ptrsPtr: number, ptrsSize: number): void;
