<img src="https://github.com/duckdb/duckdb-wasm/blob/447dd9fc3c4f969b2e1d1379f95331e27d622e05/misc/duckdb_wasm.svg" height="64">

[![Main](https://github.com/duckdb/duckdb-wasm/actions/workflows/main.yml/badge.svg)](https://github.com/duckdb/duckdb-wasm/actions/workflows/main.yml)
[![Benchmarks](https://github.com/duckdb/duckdb-wasm/actions/workflows/benchmarks.yml/badge.svg)](https://github.com/duckdb/duckdb-wasm/actions/workflows/benchmarks.yml)
[![npm](https://img.shields.io/npm/v/@duckdb/duckdb-wasm?logo=npm)](https://www.npmjs.com/package/@duckdb/duckdb-wasm/v/latest)

**DuckDB-Wasm**

is an in-process analytical SQL database for the browser. It is powered by WebAssembly, speaks Arrow fluently, reads Parquet, CSV and JSON files backed by Filesystem APIs or HTTP requests and has been tested with Chrome, Firefox, Safari and Node.js. Try it out at [shell.duckdb.org](https://shell.duckdb.org) and read the [API documentation](https://shell.duckdb.org/docs/modules/index.html).

_DuckDB-Wasm is fast! If you're here for performance numbers, head over to our benchmarks at [shell.duckdb.org/versus](https://shell.duckdb.org/versus)._

**Repository Structure**
| Subproject | Description | Language |
| -- |:--|:--|
| [duckdb_wasm](/lib) | Wasm Library | C++ |
| [@duckdb/duckdb-wasm](/packages/duckdb-wasm) | Typescript API | Typescript |
| [@duckdb/duckdb-wasm-shell](/packages/duckdb-wasm-shell) | SQL Shell | Rust |
| [@duckdb/benchmarks](/packages/benchmarks) | Benchmarks | Typescript |
