# Extensions of the DuckDB sandbox build (scripts/wasi_build.sh): httpfs from the pinned checkout in
# build/duckdb-httpfs (patches/httpfs/COMMIT, patches/httpfs/wasi_sandbox.patch), built like the wasm port: no curl,
# OpenSSL or httplib client, the HTTP client is the host's relay (wasi/http_client.cpp)
duckdb_extension_load(httpfs
    SOURCE_DIR ${CMAKE_CURRENT_LIST_DIR}/../build/duckdb-httpfs
)
