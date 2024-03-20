import * as arrow from 'apache-arrow';
import * as duckdb from '../src/';
export declare function generateXInt32(n: number, cols: number): number[][];
export declare function generateArrowXInt32(n: number, cols: number): [arrow.Schema, arrow.RecordBatch[]];
export declare function testArrowInsert(db: () => duckdb.DuckDBBindings): void;
export declare function testArrowInsertAsync(db: () => duckdb.AsyncDuckDB): void;
