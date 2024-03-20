import * as duckdb from '../src/';
export declare function testFilesystem(db: () => duckdb.AsyncDuckDB, resolveData: (url: string) => Promise<Uint8Array | null>, baseDir: string, baseDirProto: duckdb.DuckDBDataProtocol): void;
