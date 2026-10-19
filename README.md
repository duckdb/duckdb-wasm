<div align="center">
  <picture>
         <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/duckdb/duckdb-wasm/main/misc/duckdb-wasm.png">
         <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/duckdb/duckdb-wasm/main/misc/duckdb-wasm.png">
         <img alt="The DuckDB WASM logo." src="https://raw.githubusercontent.com/duckdb/duckdb-wasm/main/misc/duckdb-wasm.png" height="100" width="150">
      </picture>
  <h1>DuckDB-Wasm</h1>
</div>

<div align="center">
  <a href="https://www.npmjs.com/package/@duckdb/duckdb-wasm/v/latest">
    <img src="https://img.shields.io/npm/v/@duckdb/duckdb-wasm?logo=npm" alt="duckdb-wasm package on NPM">
  </a>
  <a href="https://github.com/duckdb/duckdb-wasm/actions">
    <img src="https://github.com/duckdb/duckdb-wasm/actions/workflows/main.yml/badge.svg?branch=main" alt="Github Actions Badge">
  </a>
  <a href="https://discord.duckdb.org">
    <img src="https://shields.io/discord/909674491309850675" alt="Join Discord" />
  </a>
  <a href="https://github.com/duckdb/duckdb/releases/">
    <img src="https://img.shields.io/github/v/release/duckdb/duckdb?color=brightgreen&display_name=tag&logo=duckdb&logoColor=white" alt="Latest DuckDB Release">
  </a>
  <a href="https://www.jsdelivr.com/package/npm/@duckdb/duckdb-wasm">
    <img src="https://data.jsdelivr.com/v1/package/npm/@duckdb/duckdb-wasm/badge?style=rounded" alt="jsdeliver stats">
  </a>
</div>
<h1></h1>

[DuckDB](https://duckdb.org) is an in-process SQL OLAP Database Management System.

DuckDB-Wasm brings DuckDB to every browser thanks to WebAssembly.

Duckdb-Wasm speaks Arrow fluently, reads Parquet, CSV and JSON files backed by Filesystem APIs or HTTP requests and has been tested with Chrome, Firefox, Safari and Node.js. Learn more about DuckDB-Wasm from our [VLDB publication](https://www.vldb.org/pvldb/vol15/p3574-kohn.pdf) or the [recorded talk](https://www.youtube.com/watch?v=wm82b7PlM6s).

Try it out at [shell.duckdb.org](https://shell.duckdb.org) or at [duckdb.org/visualizer](https://duckdb.org/visualizer).
[External third party embedding of DuckDB-Wasm](https://github.com/davidgasquez/awesome-duckdb?tab=readme-ov-file#web-clients), read the [API documentation](https://shell.duckdb.org/docs/modules/index.html), check out the [web-app examples](https://github.com/duckdb-wasm-examples), and chat with us on [Discord](https://discord.duckdb.org).

## DuckDB and DuckDB-Wasm

DuckDB-Wasm is currently based on DuckDB v1.5.6.

Relevant differences:
* Default HTTP stack is different between native and Wasm versions of DuckDB
* `LOAD httpfs` will opt-in to using the same HTTP logic, but re-implemented in JavaScript
* Notable differences in network interactions:
    * Requests are always upgraded to HTTPS
    * Requests needs server to allow Cross Origin access on a given resource
* Extension install is lazy, meaning that `INSTALL extension_name FROM 'https://repository.endpoint.org';` defer fetching the extension to the first `LOAD extension_name;` instruction. `INSTALL x FROM community;` shorthands are also supported.
* DuckDB-Wasm builds are optimized for download speed. Core extensions like autocomplete, JSON, Parquet and ICU are usually bundled DuckDB binaries, while in duckdb-wasm they are autoloaded (including fetching them) at runtime. In particular for ICU autoloading do not work corrently in all cases, explicit `LOAD icu;` might be needed to reproduce same behaviour.
* DuckDB-Wasm is sandboxed and migth not have the same level of support for out-of-core operations and access to file system
* DuckDB-Wasm default mode is single threaded. Multithreading is at the moment still experimental.

Supported DuckDB features:
* DuckDB databases files are compatible to be read from DuckDB-Wasm.
* Databases files can be made available as simple as: `ATTACH 'https://blobs.duckdb.org/data/test.db'; FROM db.t;` [demo](https://shell.duckdb.org/#queries=v0,ATTACH-'https%3A%2F%2Fblobs.duckdb.org%2Fdata%2Ftest.db'-as-db~,FROM-db.t~)
* Spatial support via `LOAD spatial` [spatial demo](https://shell.duckdb.org/#queries=v0,%20%20-Spatial-extension-for-geospatial-support%0AINSTALL-spatial~%0ALOAD-spatial~,CREATE-TABLE-stations-AS%0A----FROM-'s3%3A%2F%2Fduckdb%20blobs%2Fstations.parquet'~,%20%20-What-are-the-top%203-closest-Intercity-stations%0A%20%20-using-aerial-distance%3F%0ASELECT%0A----s1.name_long-AS-station1%2C%0A----s2.name_long-AS-station2%2C%0A----ST_Distance(%0A--------ST_Point(s1.geo_lng%2C-s1.geo_lat)%2C%0A--------ST_Point(s2.geo_lng%2C-s2.geo_lat)%0A----)-*-111139-AS-distance%0AFROM-stations-s1%2C-stations-s2%0AWHERE-s1.type-LIKE-'%25Intercity%25'%0A--AND-s2.type-LIKE-'%25Intercity%25'%0A--AND-s1.id-%3C-s2.id%0AORDER-BY-distance-ASC%0ALIMIT-3~)
* A growing subset of extensions, either core, community or external, are supported for DuckDB-Wasm
* Multithreading work but it's still experimental and by default not enabled

## DuckDB-Wasm and DuckDB Extension

DuckDB is extensible and this allows to delegate functionality to [extensions](https://duckdb.org/docs/extensions/overview).

Core extensions are available at https://extensions.duckdb.org, and community extensions are available at https://community-extensions.duckdb.org.
```sql
--- Excplicitly load extensions
LOAD icu;

--- Or have them autoloaded when using relevant functions or settings
DESCRIBE FROM read_parquet('https://blobs.duckdb.org/stations.parquet');  -- (this autoloads JSON)

--- Or register extensions
INSTALL h3 FROM community;
INSTALL sqlite_scanner FROM 'https://extensions.duckdb.org';
INSTALL quack FROM 'https://community-extensions.duckdb.org';

--- And then load them
LOAD h3;
LOAD sqlite_scanner;
LOAD quack;
```

```sql
FROM duckdb_extensions() WHERE loaded;
```
Will show that h3, icu, parquet, quack and sqlite_scanner have been loaded.

You can try the [Shell demo with loading of extensions](https://shell.duckdb.org/#queries=v0,%20%20%20-Explicitly-load-extensions%0ALOAD-icu~%0A%0A%20%20%20-Or-have-them-autoloaded-when-using-relevant-functions-or-settings%0ADESCRIBE-FROM-read_parquet('https%3A%2F%2Fblobs.duckdb.org%2Fstations.parquet')~--%20%20-(this-autoloads-parquet)%0A%0A%20%20%20-Or-register-extensions%0AINSTALL-h3-FROM-community~%0AINSTALL-sqlite_scanner-FROM-'https%3A%2F%2Fextensions.duckdb.org'~%0AINSTALL-quack-FROM-'https%3A%2F%2Fcommunity%20extensions.duckdb.org'~%0A%0A%20%20%20-And-then-load-them%3A%0ALOAD-h3~%0ALOAD-sqlite_scanner~%0ALOAD-quack~,FROM-duckdb_extensions()-WHERE-loaded~) but this do require about 3.2 MB of compressed Wasm files to be transfered over the network (on first visit, caching might help).

Extension sizes will vary depending, among other things, on provided functionality or toolchain used.


## Build from source

The build requires:

* Node.js and npm. Node.js 24 is required for the current browser test tooling.
* Yarn Classic. This repository uses a Yarn v1 lockfile.
* Emscripten 6.0.9 or a compatible 6.0.x release, CMake, and ccache.
* Rust and rustup for building the shell.
* The DuckDB CLI when generating the complete test dataset.

Install Yarn Classic and the Rust Wasm target before starting the build:

```shell
npm install --global yarn@1.22.22
yarn --version
rustup target add wasm32-unknown-unknown
```

```shell
git clone https://github.com/duckdb/duckdb-wasm.git
cd duckdb-wasm
git submodule init
git submodule update
make apply_patches
make build_loadable TARGET=threads
make serve
```

During the Wasm build, the build script checks for `js-beautify` and installs
it globally with npm if it is missing. The initial
`js-beautify: command not found` message is therefore expected when the tool
is not already installed.

If the build stops with `make: yarn: No such file or directory`, install Yarn
Classic using the command above and run `make serve` again. There is no need
to run `make apply_patches` again.

The JavaScript bundle requires both the base and threaded Wasm bindings.
`make build_loadable TARGET=threads` generates the threaded bindings before
`make serve`. The `serve` target also ensures that both variants are built.

Node.js 26 can build the shell and application, but it is not currently
supported by the Karma/Puppeteer test toolchain and can fail with
`require is not defined in ES module scope` or a missing yargs module. Use
Node.js 24 when running browser tests.

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

The development server uses port 8080 when available. If that port is already
in use, `http-server` selects another port; open the URL printed under
`Available on` in the terminal.

### Develop HTTPFS locally

HTTPFS is loaded as a separate Wasm side module. Build it with the same DuckDB
revision, Emscripten toolchain, and platform settings as the DuckDB-Wasm main
module.

Keep the HTTPFS checkout outside the generated `build/` directory. From the
DuckDB-Wasm repository, run:

```shell
make build_httpfs_local DUCKDB_HTTPFS_DIRECTORY=$PWD/duckdb-httpfs
```

`DUCKDB_HTTPFS_DIRECTORY` must point to the HTTPFS source root that contains
its top-level `CMakeLists.txt`. The target:

* validates and converts the path to an absolute path;
* reconfigures existing base and threaded builds to use that checkout;
* builds both DuckDB-Wasm main modules and HTTPFS side modules; and
* rebuilds the JavaScript package.

During configuration, confirm that CMake reports the expected source:

```text
Load extension 'httpfs' from local path ".../duckdb-httpfs"
```

The generated HTTPFS modules are placed at:

```text
build/extension_repository/<duckdb-revision>/wasm_base/httpfs.duckdb_extension.wasm
build/extension_repository/<duckdb-revision>/wasm_threads/httpfs.duckdb_extension.wasm
```

#### Run the HTTPFS test suite

With the HTTPFS checkout at `$HOME/work/duckdb-httpfs`, run the complete
build and test sequence with:

```shell
make tests
```

Use `DUCKDB_HTTPFS_DIRECTORY` when the checkout is elsewhere:

```shell
make tests DUCKDB_HTTPFS_DIRECTORY=/path/to/duckdb-httpfs
```

The target applies the repository patches, builds the base and threaded Wasm
modules with the local HTTPFS side module, and then runs the Node.js, base
Chrome, threaded Chrome, dedicated HTTPFS, threaded smoke, lint, and formatting
checks. It runs JavaScript tests with Node.js 24 and detects Google Chrome or
Chromium automatically. Override the detected commands when necessary:

```shell
make tests \
    CHROME_BIN=/path/to/chrome \
    TEST_YARN='node /path/to/yarn.js'
```

The Chrome suites run sequentially because they share the same local S3 test
server port.

#### Load the local extension in a browser

Local extension builds are unsigned. `make serve_httpfs_local` enables them
only in its local application build and configures `/extension_repository`
before opening the database. Normal application builds keep signature
verification enabled.

For another local React application, use the equivalent startup configuration:

```tsx
<DuckDBProvider
    config={{
        allowUnsignedExtensions: true,
        extensionRepository: `${window.location.origin}/extension_repository`,
    }}
>
```

For the direct JavaScript API:

```ts
await db.open({
    allowUnsignedExtensions: true,
    extensionRepository: new URL('/extension_repository', location.href).href,
});
```

These are startup options. SQL cannot enable unsigned extensions after the
database has been opened.

Build the modules, prepare the application, copy the local extension
repository, and start the development server with:

```shell
make serve_httpfs_local DUCKDB_HTTPFS_DIRECTORY=$PWD/duckdb-httpfs
```

The target opens `/original.html`. Use a fresh browser tab after rebuilding so
an older worker does not keep stale modules, then run:

```sql
INSTALL AND LOAD httpfs;
```

#### Troubleshooting

* A request to `https://extensions.duckdb.org` means that the local
  `extensionRepository` setting was not applied.
* An unsigned-extension error means that `allowUnsignedExtensions` was not
  enabled before opening the database.
* An OpenSSL or `curl/curl.h` error means that the selected HTTPFS revision
  does not contain the required Emscripten build guards.
* The warning that HTTPFS has a `vcpkg.json` but the build does not use vcpkg
  is expected for this Emscripten build.

### Rebuild the web shell

After changing the Rust shell, rebuild both the shell package and the
application that embeds its Wasm file:

```shell
yarn workspace @duckdb/duckdb-wasm-shell build:debug
yarn workspace @duckdb/duckdb-wasm-app build:release
cp -R build/extension_repository packages/duckdb-wasm-app/build/release/
npx http-server packages/duckdb-wasm-app/build/release -c-1 -a 127.0.0.1 -p 8081
```

Open `/original.html` at the URL printed by `http-server` and hard-refresh the
page. The `-c-1` option disables the development server cache so an existing
browser does not reuse an older shell Wasm file or worker. Running `make serve`
performs the same rebuild as part of the complete build.

### Local build troubleshooting log

| Failure | Cause | Fix |
| ------- | ----- | --- |
| `duckdb-threads.js: No such file or directory` | Only the base Wasm binding was built. | Run `make build_loadable TARGET=threads`. The `serve` target now builds both base and threaded bindings. |
| `duckdb-threads.pthread.js: No such file or directory` | Emscripten 6 uses the main threads worker for pthreads and no longer emits the legacy file. | The bundler now creates the legacy filename as a compatibility alias of the main threads worker. |
| A repeated Wasm build fails while patching `markAsFinished` | The generated Emscripten glue had already been patched. | The glue patch is now idempotent and safely handles repeated builds. |
| `chmod: duckdb: No such file or directory` during `make build/data` | The data script detected the DuckDB CLI but invoked a nonexistent submodule build. | The script now prefers `DUCKDB_SHELL`, then a native CLI built from the DuckDB submodule, and finally `duckdb` from `PATH`. |
| `Arrow file does not contain correct footer`, or result queries such as `SELECT 42` hang | The Rust web shell used Arrow `FileReader`, while DuckDB now returns an Arrow IPC stream. | The shell now uses `StreamReader` and returns decoding errors instead of panicking. Rebuild the shell and application using the commands above. |
| A fixed query starts hanging again after rebuilding | An existing browser tab may still be running a cached shell Wasm file or worker. | `make serve` now disables HTTP caching. Restart the server, close old DuckDB-Wasm tabs, and open `/original.html` again. |
| `failed to create temp dir for cargo install wasm-bindgen` | `wasm-pack` cannot write to its temporary or Cargo installation directory. | Run the build in an environment with writable temporary and Cargo directories. |
| `listen EPERM` or an occupied port while starting `http-server` | The environment prevents binding the requested port, or another process already uses it. | Allow local port binding or select another port, for example `-p 8091`. |
| Puppeteer/Karma fails under Node.js 26 | The current test dependencies are incompatible with Node.js 26. | Run browser tests with Node.js 24. This does not prevent building the shell and app with Node.js 26. |

## Repository Structure

| Subproject                                               | Description    | Language   |
| -------------------------------------------------------- | :------------- | :--------- |
| [duckdb_wasm](/lib)                                      | Wasm Library   | C++        |
| [@duckdb/duckdb-wasm](/packages/duckdb-wasm)             | Typescript API | Typescript |
| [@duckdb/duckdb-wasm-shell](/packages/duckdb-wasm-shell) | SQL Shell      | Rust       |
| [@duckdb/duckdb-wasm-app](/packages/duckdb-wasm-app)     | GitHub Page    | Typescript |
| [@duckdb/react-duckdb](/packages/react-duckdb)           | React Hooks    | Typescript |
