<img src="https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@latest/dist/img/duckdb_wasm.svg" height="64">

[![Main](https://github.com/duckdb/duckdb-wasm/actions/workflows/main.yml/badge.svg)](https://github.com/duckdb/duckdb-wasm/actions/workflows/main.yml)
[![Benchmarks](https://github.com/duckdb/duckdb-wasm/actions/workflows/benchmarks.yml/badge.svg)](https://github.com/duckdb/duckdb-wasm/actions/workflows/benchmarks.yml)
[![duckdb](https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@latest/dist/img/duckdb_version_badge.svg)](https://github.com/duckdb/duckdb)
[![npm](https://img.shields.io/npm/v/@duckdb/duckdb-wasm?logo=npm)](https://www.npmjs.com/package/@duckdb/duckdb-wasm/v/latest)
[![JSDevlivr](https://data.jsdelivr.com/v1/package/npm/@duckdb/duckdb-wasm/badge?style=rounded)](https://www.jsdelivr.com/package/npm/@duckdb/duckdb-wasm)

**DuckDB-Wasm**

DuckDB-Wasm is an in-process analytical SQL database for the browser. It is powered by WebAssembly, speaks Arrow fluently, reads Parquet, CSV and JSON files backed by Filesystem APIs or HTTP requests and has been tested with Chrome, Firefox, Safari and Node.js. Learn more about DuckDB-Wasm from our [VLDB publication](https://www.vldb.org/pvldb/vol15/p3574-kohn.pdf) or the [recorded talk](https://www.youtube.com/watch?v=wm82b7PlM6s).

Try it out at [shell.duckdb.org](https://shell.duckdb.org) or [Observable](https://observablehq.com/@observablehq/duckdb), read the [API documentation](https://shell.duckdb.org/docs/modules/index.html), check out the [web-app examples](https://github.com/duckdb-wasm-examples), and chat with us on [Discord](https://discord.gg/tcvwpjfnZx).

[![discord](https://shields.io/discord/909674491309850675)](https://discord.gg/tcvwpjfnZx)

_DuckDB-Wasm is fast! If you're here for performance numbers, head over to [our benchmarks](https://shell.duckdb.org/versus)._

**Repository Structure**

| Subproject                                               | Description    | Language   |
| -------------------------------------------------------- | :------------- | :--------- |
| [duckdb_wasm](/lib)                                      | Wasm Library   | C++        |
| [@duckdb/duckdb-wasm](/packages/duckdb-wasm)             | Typescript API | Typescript |
| [@duckdb/duckdb-wasm-shell](/packages/duckdb-wasm-shell) | SQL Shell      | Rust       |
| [@duckdb/duckdb-wasm-app](/packages/duckdb-wasm-app)     | GitHub Page    | Typescript |
| [@duckdb/benchmarks](/packages/benchmarks)               | Benchmarks     | Typescript |
| [@duckdb/react-duckdb](/packages/react-duckdb)           | React Hooks    | Typescript |
