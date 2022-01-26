import React, { ReactElement } from 'react';
import * as duckdb from '@duckdb/duckdb-wasm';
import { useDuckDBLogger, useDuckDBBundle } from './platform_provider';

export interface DuckDBStatus {
    instantiationProgress: duckdb.InstantiationProgress | null;
    instantiationError: any | null;
}

const dbCtx = React.createContext<duckdb.AsyncDuckDB | null>(null);
const statusCtx = React.createContext<DuckDBStatus | null>(null);
export const useDuckDB = (): duckdb.AsyncDuckDB => React.useContext(dbCtx)!;
export const useDuckDBStatus = (): DuckDBStatus => React.useContext(statusCtx)!;

type DuckDBProps = {
    children: React.ReactElement | ReactElement[];
};

export const DuckDBProvider: React.FC<DuckDBProps> = (props: DuckDBProps) => {
    const logger = useDuckDBLogger();
    const bundle = useDuckDBBundle();
    const [db, setDb] = React.useState<duckdb.AsyncDuckDB | null>(null);
    const [status, setStatus] = React.useState<DuckDBStatus | null>(null);

    // Reinitialize the worker and the database when the bundle changes
    const lock = React.useRef<boolean>(false);
    React.useEffect(() => {
        // No bundle available?
        if (!bundle) return;
        // Is updating?
        if (lock.current) return;
        lock.current = true;

        // Create worker and next database
        let worker: Worker;
        let next: duckdb.AsyncDuckDB;
        try {
            worker = new Worker(bundle.mainWorker!);
            next = new duckdb.AsyncDuckDB(logger, worker);
        } catch (e) {
            lock.current = false;
            setStatus({
                instantiationProgress: null,
                instantiationError: e,
            });
            return;
        }

        // Instantiate the database asynchronously
        const init = async () => {
            try {
                await next.instantiate(bundle.mainModule, bundle.pthreadWorker, (p: duckdb.InstantiationProgress) => {
                    try {
                        setStatus({
                            instantiationProgress: p,
                            instantiationError: null,
                        });
                    } catch (e: any) {
                        console.warn(`progress handler failed with error: ${e.toString()}`);
                    }
                });
            } catch (e) {
                lock.current = false;
                setStatus({
                    instantiationProgress: null,
                    instantiationError: e,
                });
                return;
            }
            lock.current = false;
            setDb(next);
        };
        init();
        // Terminate the worker on destruction
        return () => {
            worker.terminate();
        };
    }, [logger, bundle]);

    return (
        <dbCtx.Provider value={db}>
            <statusCtx.Provider value={status}>{props.children}</statusCtx.Provider>
        </dbCtx.Provider>
    );
};
