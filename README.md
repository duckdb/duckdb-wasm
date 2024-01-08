<div align="center">
  <img src="https://raw.githubusercontent.com/duckdb/duckdb-wasm/main/misc/duckdb_wasm.svg" height="80">
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

Try it out at [shell.duckdb.org](https://shell.duckdb.org) or [Observable](https://observablehq.com/@observablehq/duckdb), read the [API documentation](https://shell.duckdb.org/docs/modules/index.html), check out the [web-app examples](https://github.com/duckdb-wasm-examples), and chat with us on [Discord](https://discord.duckdb.org).

## Build from source
```shell
git clone https://github.com/duckdb/duckdb-wasm.git
cd duckdb-wasm
git submodule init
git submodule update
make
```

## Repository Structure

| Subproject                                               | Description    | Language   |
| -------------------------------------------------------- | :------------- | :--------- |
| [duckdb_wasm](/lib)                                      | Wasm Library   | C++        |
| [@duckdb/duckdb-wasm](/packages/duckdb-wasm)             | Typescript API | Typescript |
| [@duckdb/duckdb-wasm-shell](/packages/duckdb-wasm-shell) | SQL Shell      | Rust       |
| [@duckdb/duckdb-wasm-app](/packages/duckdb-wasm-app)     | GitHub Page    | Typescript |
| [@duckdb/react-duckdb](/packages/react-duckdb)           | React Hooks    | Typescript |
