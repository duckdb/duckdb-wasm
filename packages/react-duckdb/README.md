# DuckDBProvider

The `DuckDBProvider` is a React component that provides a connection to a DuckDB database using the `@duckdb/duckdb-wasm` library. It manages the database instance, connection pool, and allows establishing connections to the database.

## Installation

To use the `DuckDBProvider`, you need to install the required dependencies:

```
npm install @duckdb/duckdb-wasm
```

## Usage

Wrap your application or the components that need access to the DuckDB database with the `DuckDBProvider`:

```ts
import React from 'react';
import { DuckDBProvider } from './duckdb_provider';

const DUCKDB_BUNDLES: DuckDBBundles = {
    mvp: {
        mainModule: '/duckdb/duckdb-mvp.wasm',
        mainWorker: '/duckdb/duckdb-browser-mvp.worker.js',
    },
    eh: {
        mainModule: '/duckdb/duckdb-eh.wasm',
        mainWorker: '/duckdb/duckdb-browser-eh.worker.js',
    },
    coi: {
        mainModule: '/duckdb/duckdb-coi.wasm',
        mainWorker: '/duckdb/duckdb-browser-coi.worker.js',
        pthreadWorker: '/duckdb/duckdb-browser-coi.pthread.worker.js',
    },
};

function App() {
    return <DuckDBProvider bundles={DUCKDB_BUNDLES}>{/* Your application components */}</DuckDBProvider>;
}
```

The `DuckDBProvider` requires the `bundles` prop, which is an object specifying the paths to the DuckDB WASM modules and workers.

## Accessing the Database and Connections

To access the DuckDB database instance and establish connections, use the `useDuckDB` hook within a component wrapped by the `DuckDBProvider`:

```ts
import React from 'react';
import { useDuckDB } from './duckdb_provider';

function MyComponent() {
    const { database, connection, isConnecting } = useDuckDB();

    if (isConnecting) {
        return <div>Establishing connection...</div>;
    }

    if (!connection) {
        return <div>No connection available</div>;
    }

    // Use the connection to execute queries
    // ...

    return <div>Connected to DuckDB!</div>;
}
```

The `useDuckDB` hook returns an object with the following properties:

-   `database`: The `AsyncDuckDB` instance (if available).
-   `connection`: The established `AsyncDuckDBConnection` (if available).
-   `isConnecting`: A boolean indicating if a connection is currently being established.
    You can use the `connection` to execute queries and interact with the DuckDB database.

## Configuration

The `DuckDBProvider` accepts additional props for configuration:

-   `bundle`: The name of the bundle to use (if multiple bundles are provided).
-   `logger`: A custom logger instance (default is `ConsoleLogger`).
-   `config`: Additional configuration options for the DuckDB database.

```ts
<DuckDBProvider bundles={bundles} bundle="mvp" logger={customLogger} config={{ filePath: '/path/to/database.db' }}>
    {/* Your application components */}
</DuckDBProvider>
```
