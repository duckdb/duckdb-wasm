# Local development guide

Building DuckDB-Wasm from source, running the app as the `wasm_eh` (base) or
`wasm_threads` bundle, and loading extensions from the published repositories
(`core`, `core_nightly`, `community`) or from unsigned local checkouts.

## 1. Prerequisites

The build requires:

* Node.js and npm. Node.js 24 is required for the current browser test tooling.
* Yarn Classic. This repository uses a Yarn v1 lockfile.
* Emscripten 6.0.9 or a compatible 6.0.x release, CMake, and ccache.
* Ninja, or pass `GEN=make` to the loadable Make targets.
* Rust and rustup for building the shell.
* Python 3 for the staging and serving scripts.
* vcpkg when building the `aws` or `quack` extensions from local checkouts.
* The DuckDB CLI when generating the complete test dataset.

Install Yarn Classic and the Rust Wasm target before starting the build:

```shell
npm install --global yarn@1.22.22
yarn --version
rustup target add wasm32-unknown-unknown
```

## 2. Checkout and patches

```shell
git clone https://github.com/duckdb/duckdb-wasm.git
cd duckdb-wasm
git submodule update --init
make apply_patches
```

Apply patches after initializing the submodules. Do not repeat this step when
retrying a build after installing a missing tool. The nanoarrow submodule's
own DuckDB checkout is not used by the Wasm build.

## 3. Version label

The DuckDB version is pinned by `submodules/duckdb`. Extensions are fetched
from `<repository>/<version>/<platform>/<name>.duckdb_extension.wasm`, where
`<version>` is the release tag when the engine is built as a release and the
short commit hash otherwise. The published repositories use the tag for release
commits. For a release-tag checkout, export the tag before every build command:

```shell
export OVERRIDE_GIT_DESCRIBE=$(git -C submodules/duckdb describe --tags --exact-match)
```

Without it the main module reports a development version, looks for extensions
under the commit hash, and finds nothing on `core` or `core_nightly`. Do not
give development code an unrelated release label: when the submodule is not at
a tag, `describe --tags --exact-match` fails and `OVERRIDE_GIT_DESCRIBE` stays
unset, so the hash is used. Check with the `curl` loop in section 5.4 whether a
published repository has a directory for it. Local checkouts always match:
`scripts/stage_local_extensions.py` places them under whatever version and
platform the main module reports.

Check the running engine with:

```sql
PRAGMA version;    -- the OVERRIDE_GIT_DESCRIBE value, or the commit hash
PRAGMA platform;   -- wasm_eh or wasm_threads
```

## 4. Build and serve

Two Make targets build both Wasm variants, the JavaScript bindings, the Rust
shell, the docs and the app, copy `build/extension_repository` into the app,
and serve it on `127.0.0.1` with the HTTP cache disabled. A separate
`make build_loadable TARGET=threads` is unnecessary.

| Target | Bundle | Server |
| ------ | ------ | ------ |
| `make serve_base PORT=8081` | `wasm_eh` | `http-server` |
| `make serve_threads PORT=8081` | `wasm_threads` | `scripts/serve_coi.py` |

Both open `/original.html?local-extensions` (section 5.2) on `PORT`, default
8081. Drop the query parameter from the URL for a page with signature
verification on and `https://extensions.duckdb.org` as the default repository.
After rebuilding, close old DuckDB-Wasm tabs and open a fresh one so an old
worker cannot reuse stale modules.

### 4.1 `wasm_eh`

```shell
make serve_base PORT=8081
```

To serve an existing build without rebuilding:

```shell
npx http-server packages/duckdb-wasm-app/build/release -c-1 -a 127.0.0.1 -p 8081 -o '/original.html?local-extensions'
```

### 4.2 `wasm_threads`

```shell
make serve_threads PORT=8081
```

`selectBundle()` in `packages/duckdb-wasm/src/platform.ts` picks
`duckdb-threads.wasm` only when the page is `crossOriginIsolated`, which needs
two response headers on every file:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

`serve_base` uses `http-server`, which cannot send custom headers, so it
always ends up on `wasm_eh`. `serve_threads` serves the same release directory
through `scripts/serve_coi.py`, which adds both headers. To serve an existing
build without rebuilding:

```shell
python3 scripts/serve_coi.py packages/duckdb-wasm-app/build/release 8081 --open
```

If `PRAGMA platform` says `wasm_eh`, the page is not isolated: run
`crossOriginIsolated` in the DevTools console (must be `true`) and
`curl -sI http://127.0.0.1:8081/original.html` to see the headers.

`require-corp` only lets the page load cross-origin responses that carry CORS
or CORP headers. `extensions.duckdb.org` and `nightly-extensions.duckdb.org`
send `access-control-allow-origin: *`, so extension fetches are unaffected.

### 4.3 Partial rebuilds

To rebuild only one main module:

```shell
make build_loadable TARGET=base
make build_loadable TARGET=threads
```

The JavaScript package still needs both variants to bundle the app. The
loadable targets use Ninja by default; pass `GEN=make` to reuse Make builds.
Ninja uses separate directories so it does not invalidate the old Make caches:

```text
build/relsize/{base,threads}-ninja/
build/local_extensions/{httpfs,aws,quack}/{base,threads}-ninja/
```

After editing the Rust shell, rebuild the shell package and the app that embeds
it. For app-only edits, skip the first command:

```shell
yarn workspace @duckdb/duckdb-wasm-shell build:debug
yarn workspace @duckdb/duckdb-wasm-app build:release
cp -R build/extension_repository packages/duckdb-wasm-app/build/release/
npx http-server packages/duckdb-wasm-app/build/release -c-1 -a 127.0.0.1 -p 8081
```

Copy the extension repository after rebuilding the app, because Webpack cleans
its output directory. The `-c-1` option disables the HTTP cache. Use
`scripts/serve_coi.py` instead of `http-server` for the threaded bundle.

During the Wasm build, the build script checks for `js-beautify` and installs
it globally with npm if it is missing. The initial
`js-beautify: command not found` message is therefore expected when the tool
is not already installed.

## 5. Extensions

The Wasm extension provider (`lib/src/extension_provider.cc`) resolves every
non-path extension to
`<repository>/<version>/<platform>/<name>.duckdb_extension.wasm`. `http://`
URLs on `*.duckdb.org` are upgraded to `https://`. An explicit `FROM` always
wins over the default repository.

| SQL | Page | Fetched from | Signature |
| --- | ---- | ------------ | --------- |
| `INSTALL AND LOAD aws;` | plain | `https://extensions.duckdb.org/<version>/<platform>/aws...` | verified |
| `INSTALL AND LOAD aws;` | `?local-extensions` | `http://127.0.0.1:<port>/extension_repository/<version>/<platform>/aws...` | skipped |
| `INSTALL AND LOAD aws FROM core_nightly;` | either | `https://nightly-extensions.duckdb.org/<version>/<platform>/aws...` | skipped on `?local-extensions`, verified otherwise |
| `LOAD aws FROM core_nightly;` | either | same as above | same as above |

### 5.1 Local checkouts

CI and local builds use `scripts/wasm_build_lib.sh`. Set a checkout variable to
also build that extension; unset or empty variables skip it. There is no
separate local build command. The paths are examples:

```shell
export DUCKDB_HTTPFS_DIRECTORY="$HOME/work/duckdb-httpfs"
export DUCKDB_AWS_DIRECTORY="$HOME/work/duckdb-aws"
export DUCKDB_QUACK_DIRECTORY="$HOME/work/duckdb-quack"

make serve_base PORT=8081       # wasm_eh
make serve_threads PORT=8081    # wasm_threads
```

Each checkout must contain `CMakeLists.txt` and `extension_config.cmake` and
support Wasm. Invalid paths fail before compilation. Keep checkouts outside the
generated `build/` directory. Extension builds use the main module's DuckDB
sources, version and compiler flags; the threaded variant passes
`-DUSE_WASM_THREADS=ON` so the module imports shared memory like the main
module. Each repo keeps its own dependencies; there is no local
extension config or merged vcpkg manifest.

`aws` and `quack` require vcpkg. `VCPKG_TOOLCHAIN_PATH` defaults to
`$HOME/vcpkg/scripts/buildsystems/vcpkg.cmake`; override it if needed. Base and
threaded dependencies are built separately with matching compiler flags.
`httpfs` does not need vcpkg for Wasm.

Each variant writes to `build/extension_repository`, the directory CI uploads.
Repository paths include the platform:

```text
build/extension_repository/<version>/wasm_eh/<name>.duckdb_extension.wasm
build/extension_repository/<version>/wasm_threads/<name>.duckdb_extension.wasm
```

A module belongs under `<version>/<platform>/`, not directly under
`<version>/`. Renaming a directory does not change a module's metadata; use the
same DuckDB revision, version label, Emscripten toolchain and platform for the
main module and each extension. Unsetting a checkout variable removes its old
generated module for that version and platform. Source checkouts and compiler
caches are not removed.

### 5.2 Unsigned modules

Local builds are unsigned. Enable them only for code you trust, before opening
the database. SQL cannot enable unsigned extensions afterward.

Open `/original.html?local-extensions` on `localhost`, `127.0.0.1` or `[::1]`
(`packages/duckdb-wasm-app/src/local_extensions.ts`). The flag sets
`allowUnsignedExtensions: true` and selects the same-origin
`/extension_repository`. It disables signature checks for every source in that
tab, including `core_nightly`. Ordinary app URLs keep signature verification
enabled. For other React apps:

```tsx
<DuckDBProvider config={{ allowUnsignedExtensions: true }}>
```

For the direct JavaScript API:

```ts
await db.open({ allowUnsignedExtensions: true });
```

Other embeddings can set `extensionRepository` to
`new URL('/extension_repository', location.href).href` in the startup config.

### 5.3 Loading

On a `?local-extensions` page, bare `INSTALL AND LOAD` takes the local build;
`FROM` picks a published repository. Both work in one tab:

```sql
INSTALL AND LOAD httpfs;                  -- local checkout, unsigned
INSTALL AND LOAD aws FROM core_nightly;   -- published nightly build
INSTALL AND LOAD quack FROM core_nightly;
FROM duckdb_extensions() WHERE loaded;
```

An extension loads once per database instance. To compare the local and the
published build of the same extension, use two tabs.

### 5.4 Published availability

Check what a published repository has for your version before relying on it.
`403` from these hosts means the file is not published; `FROM core`, another
repository or a local checkout is the fallback:

```shell
VERSION=${OVERRIDE_GIT_DESCRIBE:-$(git -C submodules/duckdb rev-parse --short=10 HEAD)}
for p in wasm_eh wasm_threads; do for e in httpfs aws quack; do
  printf '%s/%s/%s ' "$VERSION" "$p" "$e"; curl -s -o /dev/null -w '%{http_code}\n' \
    "https://nightly-extensions.duckdb.org/$VERSION/$p/$e.duckdb_extension.wasm"
done; done
```

## 6. Test data

Some browser tests require generated data files. Generate the small university
dataset used by the threads smoke test with:

```shell
./scripts/generate_uni.sh
```

Use `make build/data` to generate all test datasets. The data generator first
uses `DUCKDB_SHELL` when set, then looks for a native DuckDB CLI built in the
DuckDB submodule, and finally falls back to `duckdb` on `PATH`. CMake policy
warnings, Rust deprecation warnings, TypeDoc warnings, and Webpack asset-size
warnings may appear during a successful build; they are non-fatal if the
command exits successfully.

## 7. Troubleshooting

| Failure | Cause | Fix |
| ------- | ----- | --- |
| `duckdb-threads.js: No such file or directory` | Only the base Wasm binding was built. | Run one of the serve targets to build both base and threaded bindings. |
| `duckdb-threads.pthread.js: No such file or directory` | Emscripten 6 uses the main threads worker for pthreads and no longer emits the legacy file. | The bundler now creates the legacy filename as a compatibility alias of the main threads worker. |
| A repeated Wasm build fails while patching `markAsFinished` | The generated Emscripten glue had already been patched. | The glue patch is now idempotent and safely handles repeated builds. |
| `chmod: duckdb: No such file or directory` during `make build/data` | The data script detected the DuckDB CLI but invoked a nonexistent submodule build. | The script now prefers `DUCKDB_SHELL`, then a native CLI built from the DuckDB submodule, and finally `duckdb` from `PATH`. |
| `Arrow file does not contain correct footer`, or result queries such as `SELECT 42` hang | The Rust web shell used Arrow `FileReader`, while DuckDB now returns an Arrow IPC stream. | The shell now uses `StreamReader` and returns decoding errors instead of panicking. Rebuild the shell and application as in section 4.3. |
| A fixed query starts hanging again after rebuilding | An existing browser tab may still be running a cached shell Wasm file or worker. | Restart the server, close old DuckDB-Wasm tabs, and open `/original.html` again. |
| `PRAGMA platform` is `wasm_eh` on `make serve_threads` | The page is not cross-origin isolated. | Check `crossOriginIsolated` and the two headers from section 4.2; open a fresh tab. |
| `failed to create temp dir for cargo install wasm-bindgen` | `wasm-pack` cannot write to its temporary or Cargo installation directory. | Run the build in an environment with writable temporary and Cargo directories. |
| `listen EPERM` or an occupied port while starting a server | The environment prevents binding the requested port, or another process already uses it. | Allow local port binding or select another port, for example `PORT=8091`. |
| Puppeteer/Karma fails under Node.js 26 | The current test dependencies are incompatible with Node.js 26. | Run browser tests with Node.js 24. This does not prevent building the shell and app with Node.js 26. |
| `could not be fetched from .../<commit-hash>/...` with the submodule at a tag | Built without `OVERRIDE_GIT_DESCRIBE`. | Export it as in section 3 and rebuild both variants. |
| Extension fetch returns HTTP 403 or 404 | The binary is unavailable at the requested version/platform path, or the server points at another checkout. | Check the full URL and server directory; run the `curl` loop in section 5.4; use `FROM core` or a local checkout. |
| Extension metadata mismatch | The binary was built for another version or platform. | Rebuild it; renaming the directory does not change its metadata. |
| Unsigned-extension error | The local startup config was not enabled, or the hostname is not localhost. | Open `/original.html?local-extensions` on `127.0.0.1` in a fresh tab. |
| HTTPFS fails on OpenSSL or `curl/curl.h` | The HTTPFS revision lacks the required Emscripten guards. | Use a revision with those guards. A warning about its unused `vcpkg.json` is expected for an HTTPFS-only Wasm build. |
