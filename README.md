<div align="center">
  <picture>
         <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/duckdb/duckdb-wasm/main/misc/duckdb_wasm.svg">
         <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/duckdb/duckdb-wasm/main/misc/duckdb_wasm_light.svg">
         <img alt="The DuckDB WASM logo." src="https://raw.githubusercontent.com/duckdb/duckdb-wasm/main/misc/duckdb_wasm.svg" height="80">
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

Try it out at [shell.duckdb.org](https://shell.duckdb.org) or [external third party embedding of DuckDB-Wasm](https://github.com/davidgasquez/awesome-duckdb?tab=readme-ov-file#web-clients), read the [API documentation](https://shell.duckdb.org/docs/modules/index.html), check out the [web-app examples](https://github.com/duckdb-wasm-examples), and chat with us on [Discord](https://discord.duckdb.org).

## DuckDB and DuckDB-Wasm

DuckDB-Wasm is currently based on DuckDB v1.3.1.

Relevant differences:
* HTTP stack is different between native and Wasm versions of DuckDB. Most relevant are:
    * Requests are always upgraded to HTTPS
    * Requests needs server to allow Cross Origin access on a given resource
    * File system implementation (eg. S3) is different and this might cause some differences
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

```shell
git clone https://github.com/duckdb/duckdb-wasm.git
cd duckdb-wasm
git submodule init
git submodule update
make apply_patches
make serve
```

## Repository Structure

| Subproject                                               | Description    | Language   |
| -------------------------------------------------------- | :------------- | :--------- |
| [duckdb_wasm](/lib)                                      | Wasm Library   | C++        |
| [@duckdb/duckdb-wasm](/packages/duckdb-wasm)             | Typescript API | Typescript |
| [@duckdb/duckdb-wasm-shell](/packages/duckdb-wasm-shell) | SQL Shell      | Rust       |
| [@duckdb/duckdb-wasm-app](/packages/duckdb-wasm-app)     | GitHub Page    | Typescript |
| [@duckdb/react-duckdb](/packages/react-duckdb)           | React Hooks    | Typescript |
