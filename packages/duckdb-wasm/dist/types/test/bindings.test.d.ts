import * as duckdb from '../src/';
import { DuckDBDataProtocol } from '../src/';
export declare function testBindings(db: () => duckdb.DuckDBBindings, baseURL: string): void;
export declare function testAsyncBindings(adb: () => duckdb.AsyncDuckDB, baseURL: string, baseDirProto: DuckDBDataProtocol): void;
