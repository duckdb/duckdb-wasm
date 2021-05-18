export interface DuckDBRuntime {
    bindings: any;
    duckdb_web_add_file_path(url: string, path: string): number;
    duckdb_web_get_file_path(fileId: number): string | null;
    duckdb_web_add_file_blob(url: string, data: any): number;
    duckdb_web_add_file_buffer(url: string, buffer: Uint8Array): number;
    duckdb_web_get_file_object_url(fileId: number): string | null;
    duckdb_web_get_file_buffer(fileId: number): Uint8Array | null;
    duckdb_web_fs_file_open(pathPtr: number, pathLen: number, flags: number): number;
    duckdb_web_fs_file_close(fileId: number): void;
    duckdb_web_fs_file_get_last_modified_time(fileId: number): number;
    duckdb_web_fs_file_get_size(fileId: number): number;
    duckdb_web_fs_file_truncate(fileId: number, newSize: number): void;
    duckdb_web_fs_read(fileId: number, buf: number, bytes: number, location: number): number;
    duckdb_web_fs_write(fileId: number, buf: number, bytes: number, location: number): number;
    duckdb_web_fs_directory_remove(pathPtr: number, pathLen: number): void;
    duckdb_web_fs_directory_exists(pathPtr: number, pathLen: number): boolean;
    duckdb_web_fs_directory_create(pathPtr: number, pathLen: number): void;
    duckdb_web_fs_directory_list_files(pathPtr: number, pathLen: number): boolean;
    duckdb_web_fs_glob(pathPtr: number, pathLen: number): void;
    duckdb_web_fs_file_move(fromPtr: number, fromLen: number, toPtr: number, toLen: number): void;
    duckdb_web_fs_file_exists(pathPtr: number, pathLen: number): boolean;
    duckdb_web_fs_file_remove(pathPtr: number, pathLen: number): void;
}
