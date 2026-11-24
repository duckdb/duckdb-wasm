# Verify the HTTPFS loading fix

## Symptom

The first `LOAD httpfs;` on the deployed v2.0.1 web shell fails with:

```text
Attempted to register an already registered secret type: "s3"
```

The loader resolves the extension's HTTPS URL through the filesystem before initializing it. That resolution can autoload HTTPFS. The original load then attempts a second initialization. The fix preserves remote URLs and still canonicalizes local paths.

## Preconditions

Run the commands below from the DuckDB-Wasm checkout containing this fix. See [the local development guide](../local_development_guide.md) for tool installation.

Check the pinned core revision and the applied fix:

```sh
git -C submodules/duckdb rev-parse HEAD
grep -n 'FileSystem::IsRemoteFile(filename)' submodules/duckdb/src/main/extension/extension_load.cpp
```

The revision must be `8d78114e90a53823803660bf821f6073ac87da8c` (v2.0.1), and the grep must show the remote-path guard. The current working copy already has its patches applied. For a new checkout, initialize its submodules and run `make apply_patches` once before building.

Check the tools:

```sh
node --version
yarn --version
emcc --version
rustup target list --installed
```

The Rust target list must include `wasm32-unknown-unknown`. Verification used Node 24, Yarn 1.22.22 and Emscripten 6.0.10.

## Steps

1. Build both fixed engine variants without local extension checkouts:

    ```sh
    unset DUCKDB_HTTPFS_DIRECTORY DUCKDB_AWS_DIRECTORY DUCKDB_QUACK_DIRECTORY
    export OVERRIDE_GIT_DESCRIBE=v2.0.1
    yarn install --frozen-lockfile
    make build_loadable TARGET=base CORES=8
    make build_loadable TARGET=threads CORES=8
    ```

    Both builds must finish successfully. Use the v2.0.1 label only for the pinned revision checked above; the initialized submodule may have no tags. Only the loader changes, so the published v2.0.1 HTTPFS modules remain compatible.

2. Stage the published HTTPFS modules for the browser tests:

    ```sh
    for platform in wasm_eh wasm_threads; do
      mkdir -p "build/extension_repository/v2.0.1/$platform"
      curl --fail --location --silent --show-error \
        "https://extensions.duckdb.org/v2.0.1/$platform/httpfs.duckdb_extension.wasm" \
        -o "build/extension_repository/v2.0.1/$platform/httpfs.duckdb_extension.wasm"
    done
    ```

    Do this after building: the build's staging script removes modules for local extension checkouts that are unset.

3. Run the browser checks:

    ```sh
    ./scripts/generate_uni.sh
    yarn workspace @duckdb/duckdb-wasm build:debug
    CHROME_BIN='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
      yarn workspace @duckdb/duckdb-wasm test:chrome:httpfs
    ```

    On other systems, set `CHROME_BIN` to an installed Chrome executable. Expect four passing tests. They cover both engine variants, fresh and repeated loads, autoload enabled and disabled, HTTP reads, and S3 reads/writes against local fixtures. The test databases allow the staged modules without signature verification; the ordinary shell URL below keeps signature verification enabled.

4. Build the local shell app:

    ```sh
    make serve_loadable_base
    ```

    Expect `packages/duckdb-wasm-app/build/release/original.html` and the fixed Wasm assets.

5. Serve the built app in the foreground:

    ```sh
    npx http-server packages/duckdb-wasm-app/build/release -c-1 -a 127.0.0.1 -p 8081
    ```

    Open `http://127.0.0.1:8081/original.html` in a fresh tab. This ordinary URL loads signed extensions from the published repository. The manual shell UI sequence was not run in this session; the app build and browser API tests were run.

6. Before running any remote query, execute:

    ```sql
    PRAGMA version;
    PRAGMA platform;
    SET autoload_known_extensions=false;
    LOAD httpfs;
    LOAD httpfs;
    SELECT extension_name, loaded
    FROM duckdb_extensions()
    WHERE extension_name='httpfs';
    SELECT count(*) FROM duckdb_secret_types() WHERE type='s3';
    ```

    Expect version `v2.0.1`, platform `wasm_eh`, no load errors, `httpfs | true`, and one `s3` secret type. Open another fresh tab and repeat without the `SET` statement to check the default autoload setting.

7. To check the threaded shell, stop the server with Ctrl-C and run:

    ```sh
    python3 scripts/serve_coi.py packages/duckdb-wasm-app/build/release 8081 --open
    ```

    Open `/original.html` without `?local-extensions` and repeat step 6. Expect platform `wasm_threads`. The server command comes from the local development guide and was not run in this session.

## Expected vs actual

Expected: the first explicit load initializes HTTPFS once. Repeated loads do nothing. Explicit loading works even when autoload is disabled.

Actual on the affected deployed shell: the first load throws the duplicate `s3` type error. Disabling autoload changes it to an error saying the HTTPFS extension URL itself requires HTTPFS.

## After the fix

Step 6 succeeds in a fresh database for both autoload settings. Remote extension URLs are recorded unchanged; local extension paths still go through canonicalization.

Run the native regression from the DuckDB repository root:

```sh
cmake -S . -B build/httpfs-load-path -G Ninja \
  -DCMAKE_BUILD_TYPE=RelWithDebInfo \
  -DCMAKE_C_COMPILER_LAUNCHER=ccache -DCMAKE_CXX_COMPILER_LAUNCHER=ccache \
  -DBUILD_UNITTESTS=ON -DBUILD_SHELL=OFF \
  -DENABLE_SANITIZER=OFF -DENABLE_UBSAN=OFF
cmake --build build/httpfs-load-path --target unittest --parallel 8
build/httpfs-load-path/test/unittest 'Loading an extension only canonicalizes local paths'
```

It checks HTTP, HTTPS, S3 and local paths with autoload enabled and disabled. Expect 88 passing assertions. The original loader failed the remote-path case. The fixed build also passed all 738 `[api]` test cases. Additional repository SQL tests failed with this build's extension setup: JSON is statically linked and TPCH is unavailable.

The optional `HTTPFS_HTTPS_URL` browser check exposed a separate failure reading the live HTTPS Parquet file before loading HTTPFS in `wasm_eh`. The threaded variant passed that check. This fix does not change that read path; the four-test local-fixture suite passed.

## Cleanup

Stop the foreground server with Ctrl-C and close the test tabs. The SQL checks use an in-memory database and do not create persistent secrets. Generated builds and test data can remain for later runs.
