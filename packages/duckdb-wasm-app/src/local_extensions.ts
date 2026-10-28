import type { DuckDBConfig } from '@duckdb/duckdb-wasm';

export function localExtensionConfig(location: URL): DuckDBConfig | undefined {
    if (
        !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) ||
        !location.searchParams.has('local-extensions')
    ) {
        return undefined;
    }
    return {
        allowUnsignedExtensions: true,
        extensionRepository: new URL('/extension_repository', location).href,
    };
}
