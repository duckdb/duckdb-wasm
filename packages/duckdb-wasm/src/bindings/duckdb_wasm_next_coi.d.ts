import { DuckDBModule } from './duckdb_module';
export function DuckDB(moduleOverrides?: Partial<DuckDBModule>): Promise<DuckDBModule>;
export default DuckDB;

export function getPThread(): PThread;
