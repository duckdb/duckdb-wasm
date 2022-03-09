import React from 'react';
import * as imm from 'immutable';
import * as duckdb from '@duckdb/duckdb-wasm';
import { useDuckDB, useDuckDBResolver } from './database_provider';
import { ResolvableStatus } from './resolvable';

type DialerFn = (id?: number) => void;

export const poolCtx = React.createContext<imm.Map<number, duckdb.AsyncDuckDBConnection>>(imm.Map());
export const dialerCtx = React.createContext<DialerFn | null>(null);

export const useDuckDBConnection = (id?: number): duckdb.AsyncDuckDBConnection | null =>
    React.useContext(poolCtx)?.get(id || 0) || null;
export const useDuckDBConnectionDialer = (): DialerFn => React.useContext(dialerCtx)!;

type DuckDBConnectionProps = {
    /// The children
    children: React.ReactElement | React.ReactElement[];
    /// The epoch
    epoch?: number;
};

export const DuckDBConnectionProvider: React.FC<DuckDBConnectionProps> = (props: DuckDBConnectionProps) => {
    const db = useDuckDB();
    const resolveDB = useDuckDBResolver();
    const [pending, setPending] = React.useState<imm.List<number>>(imm.List());
    const [pool, setPool] = React.useState<imm.Map<number, duckdb.AsyncDuckDBConnection>>(imm.Map());

    const inFlight = React.useRef<Map<number, boolean>>(new Map());

    // Resolve request assuming that the database is ready
    const dialer = async (id: number) => {
        if (inFlight.current.get(id)) {
            return;
        }
        const conn = await db!.value!.connect();
        setPool(p => p.set(id, conn));
        inFlight.current.delete(id);
    };

    // Resolve request or remember as pending
    const dialerCallback = React.useCallback(
        (id?: number) => {
            if (db.value != null) {
                dialer(id || 0);
            } else if (!db.resolving()) {
                resolveDB();
                setPending(pending.push(id || 0));
            }
        },
        [db],
    );

    // Process pending if possible
    React.useEffect(() => {
        if (db.value == null) {
            return;
        }
        const claimed = pending;
        setPending(imm.List());
        for (const id of claimed) {
            dialer(id);
        }
    }, [db, pending]);

    return (
        <dialerCtx.Provider value={dialerCallback}>
            <poolCtx.Provider value={pool}>{props.children}</poolCtx.Provider>
        </dialerCtx.Provider>
    );
};
