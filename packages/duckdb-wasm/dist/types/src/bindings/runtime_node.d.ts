import { DuckDBRuntime, DuckDBFileInfo } from './runtime';
import { DuckDBModule } from './duckdb_module';
export declare const NODE_RUNTIME: DuckDBRuntime & {
    _filesById: Map<number, any>;
    _fileInfoCache: Map<number, DuckDBFileInfo>;
    resolveFileInfo(mod: DuckDBModule, fileId: number): DuckDBFileInfo | null;
};
export default NODE_RUNTIME;
