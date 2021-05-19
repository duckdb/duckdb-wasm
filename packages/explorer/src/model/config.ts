export interface AppConfig {
    workerURL: URL;
}

export function createDefaultConfig(): AppConfig {
    return {
        workerURL: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-parallel.worker.js', import.meta.url),
    };
}
