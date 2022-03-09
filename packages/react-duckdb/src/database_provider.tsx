import React, { ReactElement } from 'react';
import * as duckdb from '@duckdb/duckdb-wasm';
import { useDuckDBLogger, useDuckDBBundle, useDuckDBBundleResolver } from './platform_provider';
import { Resolvable, Resolver, ResolvableStatus } from './resolvable';

const setupCtx = React.createContext<Resolvable<duckdb.AsyncDuckDB, duckdb.InstantiationProgress> | null>(null);
const resolverCtx = React.createContext<Resolver<duckdb.AsyncDuckDB> | null>(null);

export const useDuckDB = (): Resolvable<duckdb.AsyncDuckDB, duckdb.InstantiationProgress> =>
    React.useContext(setupCtx)!;
export const useDuckDBResolver = (): Resolver<duckdb.AsyncDuckDB> => React.useContext(resolverCtx)!;

type DuckDBProps = {
    children: React.ReactElement | ReactElement[];
    config?: duckdb.DuckDBConfig;
    value?: duckdb.AsyncDuckDB;
};

export const DuckDBProvider: React.FC<DuckDBProps> = (props: DuckDBProps) => {
    const logger = useDuckDBLogger();
    const bundle = useDuckDBBundle();
    const resolveBundle = useDuckDBBundleResolver();
    const [setup, updateSetup] = React.useState<Resolvable<duckdb.AsyncDuckDB, duckdb.InstantiationProgress>>(
        new Resolvable<duckdb.AsyncDuckDB, duckdb.InstantiationProgress>(),
    );

    React.useEffect(() => {
        if (!bundle.resolving()) {
            resolveBundle();
        }
    }, [bundle]);

    const worker = React.useRef<Worker | null>(null);
    React.useEffect(
        () => () => {
            if (worker.current != null) {
                worker.current.terminate();
                worker.current = null;
            }
        },
        [],
    );

    const lock = React.useRef<boolean>(false);
    const resolver = React.useCallback(async () => {
        // Invalid input?
        if (!logger || !bundle || bundle.value == null) return null;
        // Is updating?
        if (lock.current) return null;
        lock.current = true;

        // Create worker and next database
        let worker: Worker;
        let next: duckdb.AsyncDuckDB;
        try {
            worker = new Worker(bundle.value.mainWorker!);
            next = new duckdb.AsyncDuckDB(logger, worker);
        } catch (e: any) {
            lock.current = false;
            updateSetup(s => s.failWith(e));
            return null;
        }

        // Instantiate the database asynchronously
        try {
            await next.instantiate(
                bundle.value.mainModule,
                bundle.value.pthreadWorker,
                (p: duckdb.InstantiationProgress) => {
                    try {
                        updateSetup(s => s.updateRunning(p));
                    } catch (e: any) {
                        console.warn(`progress handler failed with error: ${e.toString()}`);
                    }
                },
            );
            if (props.config !== undefined) {
                await next.open(props.config!);
            }
        } catch (e: any) {
            lock.current = false;
            updateSetup(s => s.failWith(e));
            return null;
        }
        lock.current = false;
        updateSetup(s => s.completeWith(next));
        return next;
    }, [logger, bundle]);

    return (
        <resolverCtx.Provider value={resolver}>
            <setupCtx.Provider value={setup}>{props.children}</setupCtx.Provider>
        </resolverCtx.Provider>
    );
};
