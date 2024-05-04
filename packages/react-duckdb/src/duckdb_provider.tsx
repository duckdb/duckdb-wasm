"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
    AsyncDuckDB,
    type AsyncDuckDBConnection,
    ConsoleLogger,
    type DuckDBBundle,
    type DuckDBBundles,
    type DuckDBConfig,
    type InstantiationProgress,
    type Logger,
    selectBundle,
} from '@duckdb/duckdb-wasm';
import { Resolvable } from './resolvable';

function isDuckDBBundle(bundle: unknown): bundle is DuckDBBundle {
    return (
        typeof bundle === 'object' &&
        bundle !== null &&
        'mainModule' in bundle &&
        typeof bundle.mainModule === 'string' &&
        'mainWorker' in bundle &&
        (typeof bundle.mainWorker === 'string' || bundle.mainWorker === null) &&
        'pthreadWorker' in bundle &&
        (typeof bundle.pthreadWorker === 'string' || bundle.pthreadWorker === null)
    );
}

type ConnectionPool = Record<number, AsyncDuckDBConnection>;

type ConnectionContextValue = {
    database: AsyncDuckDB | null;
    connectionPool: ConnectionPool;
    establishConnection: (id?: number) => Promise<void>;
};

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

// TODO: consider adding support for passing in an existing AsyncDuckDB instance
export type DuckDBProviderProps = {
    children: React.ReactNode;
    bundles: DuckDBBundles;
    bundle?: keyof DuckDBBundles;
    logger?: Logger;
    config?: DuckDBConfig;
};

export function DuckDBProvider({
    children,
    bundles,
    bundle: bundleName,
    logger = new ConsoleLogger(),
    config,
}: DuckDBProviderProps) {
    const [bundle, setBundle] = useState<Resolvable<DuckDBBundle>>(new Resolvable());
    const [database, setDatabase] = useState<Resolvable<AsyncDuckDB, InstantiationProgress>>(new Resolvable());
    const [connectionPool, setConnectionPool] = useState<ConnectionPool>({});

    const resolveBundle = useCallback(async () => {
        if (bundle.isResolving) return;

        try {
            setBundle(bundle.updateRunning());
            const selectedBundle = bundleName ? bundles[bundleName] : await selectBundle(bundles);
            if (isDuckDBBundle(selectedBundle)) {
                setBundle(bundle.completeWith(selectedBundle));
            } else {
                throw new Error('No valid bundle selected');
            }
        } catch (error) {
            setBundle(bundle.failWith(JSON.stringify(error)));
        }
    }, [bundle, bundleName]);

    const resolveDatabase = useCallback(async () => {
        if (database.isResolving || bundle.value == null) return;

        try {
            const worker = new Worker(bundle.value.mainWorker!);
            const duckdb = new AsyncDuckDB(logger, worker);
            setDatabase(database.updateRunning());

            await duckdb.instantiate(
                bundle.value.mainModule,
                bundle.value.pthreadWorker,
                (progress: InstantiationProgress) => {
                    setDatabase(database.updateRunning(progress));
                },
            );

            if (config) await duckdb.open(config);
            setDatabase(database.completeWith(duckdb));
        } catch (error) {
            setDatabase(database.failWith(JSON.stringify(error)));
        }
    }, [database, bundle.value, config]);

    useEffect(() => {
        resolveBundle();
    }, [resolveBundle]);

    useEffect(() => {
        if (bundle.value) resolveDatabase();
    }, [resolveDatabase, bundle.value]);

    const establishConnection = useCallback(
        async (connectionId?: number) => {
            // If the database is not available, return early
            if (!database.value) return;

            // Establish a new connection using the database instance
            const conn = await database.value.connect();

            // Update the connection pool by adding the new connection with the given ID
            setConnectionPool((prevPool: ConnectionPool) => ({
                ...prevPool,
                // Use the provided ID if it exists, otherwise use 0 as the default ID
                // This allows establishing a connection with a specific ID or using 0 as a fallback
                [connectionId || 0]: conn,
            }));
        },
        [database],
    );

    return (
        <ConnectionContext.Provider
            value={{
                database: database.value,
                connectionPool,
                establishConnection,
            }}
        >
            {children}
        </ConnectionContext.Provider>
    );
}

/**
 * Establish a connection to DuckDB by id, or, if no id is provided, from the pool.
 *
 * @param connectionId Optional ID of the connection to retrieve from the pool.
 * @returns An object containing the `database` instance, `connection` (if available), and a boolean `isConnecting` indicating if a connection is being established.
 *
 * @example
 * const { database, connection, isConnecting } = useDuckDB();
 * if (isConnecting) {
 *   // Handle the case when a connection is being established
 * } else if (connection) {
 *   // Use the established connection
 * } else {
 *   // Handle the case when no connection is available
 * }
 * if (database) {
 *   // Use the AsyncDuckDB instance
 * }
 */
export function useDuckDB(connectionId?: number) {
    const context = useContext(ConnectionContext);
    if (!context) {
        throw new Error('useDuckDB must be used within a DuckDBProvider');
    }

    const { database, connectionPool, establishConnection } = context;

    // Check if a connection exists in the pool for the given ID
    const connection = connectionPool[connectionId || 0] || null;

    // Determine if a connection is currently being established
    const isConnecting = !connection && !connectionPool[connectionId || 0];

    useEffect(() => {
        // If no connection exists and it's not currently being established,
        // trigger the establishConnection function to create a new connection
        if (isConnecting) establishConnection(connectionId);
    }, [connectionId, isConnecting, establishConnection]);

    return { database, connection, isConnecting };
}
