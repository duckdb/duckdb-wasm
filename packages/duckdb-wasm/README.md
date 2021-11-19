<img src="https://github.com/duckdb/duckdb-wasm/blob/447dd9fc3c4f969b2e1d1379f95331e27d622e05/misc/duckdb_wasm.svg" height="64">

[![Main](https://github.com/duckdb/duckdb-wasm/actions/workflows/main.yml/badge.svg)](https://github.com/duckdb/duckdb-wasm/actions/workflows/main.yml)
[![Benchmarks](https://github.com/duckdb/duckdb-wasm/actions/workflows/benchmarks.yml/badge.svg)](https://github.com/duckdb/duckdb-wasm/actions/workflows/benchmarks.yml)
[![npm](https://img.shields.io/npm/v/@duckdb/duckdb-wasm?logo=npm)](https://www.npmjs.com/package/@duckdb/duckdb-wasm/v/latest)

**DuckDB-Wasm**

DuckDB-Wasm is an in-process analytical SQL database for the browser. It is powered by WebAssembly, speaks Arrow fluently, reads Parquet, CSV and JSON files backed by Filesystem APIs or HTTP requests and has been tested with Chrome, Firefox, Safari and Node.js. Read the [launch blog post](https://duckdb.org/2021/10/29/duckdb-wasm.html).

Try it out at [shell.duckdb.org](https://shell.duckdb.org) and on [Observable](https://observablehq.com/@cmudig/duckdb) and read the [API documentation](https://shell.duckdb.org/docs/modules/index.html).

_DuckDB-Wasm is fast! If you're here for performance numbers, head over to [our benchmarks](https://shell.duckdb.org/versus)._

## Instantiation

```ts
// Import the ESM bundle (supports tree-shaking)
import * as duckdb from '@duckdb/duckdb-wasm';

// Either bundle them manually, for example as Webpack assets
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb.wasm';
import duckdb_wasm_next from '@duckdb/duckdb-wasm/dist/duckdb-next.wasm';
import duckdb_wasm_next_coi from '@duckdb/duckdb-wasm/dist/duckdb-next-coi.wasm';
const WEBPACK_BUNDLES: duckdb.DuckDBBundles = {
    asyncDefault: {
        mainModule: duckdb_wasm,
        mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser.worker.js', import.meta.url).toString(),
    },
    asyncNext: {
        mainModule: duckdb_wasm_next,
        mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-next.worker.js', import.meta.url).toString(),
    },
    asyncNextCOI: {
        mainModule: duckdb_wasm_next_coi,
        mainWorker: new URL(
            '@duckdb/duckdb-wasm/dist/duckdb-browser-next-coi.worker.js',
            import.meta.url,
        ).toString(),
        pthreadWorker: new URL(
            '@duckdb/duckdb-wasm/dist/duckdb-browser-next-coi.pthread.worker.js',
            import.meta.url,
        ).toString(),
    },
};
// ..., or load the bundles from jsdelivr
const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

// Select a bundle based on browser checks
const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
// Instantiate the asynchronus version of DuckDB-wasm
const worker = new Worker(bundle.mainWorker!);
const logger = new duckdb.ConsoleLogger();
const db = new duckdb.AsyncDuckDB(logger, worker);
await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
```

## Data Import

```ts
// Data can be inserted from an existing arrow.Table
await c.insertArrowTable(existingTable, { name: 'arrow_table' });
// ..., from Arrow vectors
await c.insertArrowVectors(
    {
        col1: arrow.Int32Vector.from([1, 2]),
        col2: arrow.Utf8Vector.from(['foo', 'bar']),
    },
    {
        name: 'arrow_vectors',
    },
);
// ..., from a raw Arrow IPC stream
const c = await db.connect();
const streamResponse = await fetch(`someapi`);
const streamReader = streamResponse.body.getReader();
const streamInserts = [];
while (true) {
    const { value, done } = await streamReader.read();
    if (done) break;
    streamInserts.push(c.insertArrowFromIPCStream(value, { name: 'streamed' }));
}
await Promise.all(streamInserts);

// ..., from CSV files
// (interchangeable: registerFile{Text,Buffer,URL,Handle})
await db.registerFileText(`data.csv`, '1|foo\n2|bar\n');
// ... with typed insert options
await db.insertCSVFromPath('data.csv', {
    schema: 'main',
    name: 'foo',
    detect: false,
    header: false,
    delimiter: '|',
    columns: {
        col1: new arrow.Int32(),
        col2: new arrow.Utf8(),
    },
});

// ..., from JSON documents in row-major format
await db.registerFileText(
    'rows.json',
    `[
    { "col1": 1, "col2": "foo" },
    { "col1": 2, "col2": "bar" },
]`,
);
// ... or column-major format
await db.registerFileText(
    'columns.json',
    `{
    "col1": [1, 2],
    "col2": ["foo", "bar"]
}`,
);
// ... with typed insert options
await c.insertJSONFromPath('rows.json', { name: 'rows' });
await c.insertJSONFromPath('columns.json', { name: 'columns' });

// ..., from Parquet files
const pickedFile: File = letUserPickFile();
await db.registerFileHandle('local.parquet', pickedFile);
await db.registerFileURL('remote.parquet', 'https://origin/remote.parquet');
const res = await fetch('https://origin/remote.parquet');
await db.registerFileBuffer('buffer.parquet', await res.arrayBuffer());

// ..., by specifying URLs in the SQL text
await c.query(`
    CREATE TABLE direct AS
        SELECT * FROM "https://origin/remote.parquet"
`);
// ..., or by executing raw insert statements
await c.query(`INSERT INTO existing_table
    VALUES (1, "foo"), (2, "bar")`);

// Close the connection to release memory
await c.close();
```

## Query Execution

```ts
// Either materialize the query result
await conn.query<{ v: arrow.Int }>(`
    SELECT * FROM generate_series(1, 100) t(v)
`);
// ..., or fetch the result chunks lazily
for await (const batch of await conn.send<{ v: arrow.Int }>(`
    SELECT * FROM generate_series(1, 100) t(v)
`)) {
    // ...
}
// Close the connection to release memory
await conn.close();
```

## Prepared Statements

```ts
// Prepare query
const stmt = await conn.prepare(`SELECT v + ? FROM generate_series(0, 10000) as t(v);`);
// ... and run the query with materialized results
await stmt.query(234);
// ... or result chunks
for await (const batch of await stmt.send(234)) {
    // ...
}
// Close the statement to release memory
await stmt.close();
// Closing the connection will release statements as well
await conn.close();
```
