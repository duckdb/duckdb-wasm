import { DuckDBFileInfo, DuckDBGlobalFileInfo, DuckDBRuntime } from './runtime';
import { DuckDBModule } from './duckdb_module';
export declare const BROWSER_RUNTIME: DuckDBRuntime & {
    _fileInfoCache: Map<number, DuckDBFileInfo>;
    _globalFileInfo: DuckDBGlobalFileInfo | null;
    getFileInfo(mod: DuckDBModule, fileId: number): DuckDBFileInfo | null;
    getGlobalFileInfo(mod: DuckDBModule): DuckDBGlobalFileInfo | null;
};
export default BROWSER_RUNTIME;
