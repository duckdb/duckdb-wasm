import React from 'react';
import * as duckdb from '@kimmolinna/duckdb-wasm';
import { useDuckDB } from './database_provider';

export const createDuckDBConnectionContext = () => React.createContext<duckdb.AsyncDuckDBConnection | null>(null);
export const useDuckDBConnection = (
    ctx: React.Context<duckdb.AsyncDuckDBConnection | null>,
): duckdb.AsyncDuckDBConnection => React.useContext(ctx)!;

type DuckDBConnectionProps = {
    children: React.ReactElement;
    context: React.Context<duckdb.AsyncDuckDBConnection | null>;
};

export const DuckDBConnectionProvider: React.FC<DuckDBConnectionProps> = (props: DuckDBConnectionProps) => {
    const db = useDuckDB();
    const [conn, setConn] = React.useState<duckdb.AsyncDuckDBConnection | null>(null);

    const locked = React.useRef<boolean>(false);
    React.useEffect(() => {
        // DuckDB not yet ready?
        if (!db) return;
        // Is updating?
        if (locked.current) return;
        locked.current = true;
        // Connect asynchronously
        const connect = async () => {
            try {
                const c = await db.connect();
                locked.current = false;
                setConn(c);
            } catch (e) {
                console.warn(e);
                locked.current = false;
            }
        };
        connect();
        // Disconnect when destroyed
        return () => {
            try {
                conn?.close();
            } catch (e) {
                console.warn(e);
            }
        };
    });

    return <props.context.Provider value={conn}>{props.children}</props.context.Provider>;
};
