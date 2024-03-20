import * as duckdb from '../src/';
export declare function testHTTPFS(sdb: () => duckdb.DuckDBBindings): void;
export declare function testHTTPFSAsync(adb: () => duckdb.AsyncDuckDB, resolveData: (url: string) => Promise<Uint8Array | null>, baseDir: string): void;
