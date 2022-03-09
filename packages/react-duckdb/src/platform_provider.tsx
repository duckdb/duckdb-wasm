import React from 'react';
import * as duckdb from '@duckdb/duckdb-wasm';
import { Resolvable, Resolver, ResolvableStatus } from './resolvable';

type PlatformProps = {
    children: React.ReactElement | React.ReactElement[];
    logger: duckdb.Logger;
    bundles: duckdb.DuckDBBundles;
};

const loggerCtx = React.createContext<duckdb.Logger | null>(null);
const bundleCtx = React.createContext<Resolvable<duckdb.DuckDBBundle> | null>(null);
const resolverCtx = React.createContext<Resolver<duckdb.DuckDBBundle> | null>(null);
export const useDuckDBLogger = (): duckdb.Logger => React.useContext(loggerCtx)!;
export const useDuckDBBundle = (): Resolvable<duckdb.DuckDBBundle> => React.useContext(bundleCtx)!;
export const useDuckDBBundleResolver = (): Resolver<duckdb.DuckDBBundle> => React.useContext(resolverCtx)!;

export const DuckDBPlatform: React.FC<PlatformProps> = (props: PlatformProps) => {
    const [bundle, setBundle] = React.useState<Resolvable<duckdb.DuckDBBundle>>(new Resolvable());

    const lock = React.useRef<boolean>(false);
    const resolver = React.useCallback(async () => {
        if (lock.current) return null;
        lock.current = true;
        try {
            setBundle(b => b.updateRunning());
            const next = await duckdb.selectBundle(props.bundles);
            lock.current = false;
            setBundle(b => b.completeWith(next));
            return next;
        } catch (e: any) {
            lock.current = false;
            console.error(e);
            setBundle(b => b.failWith(e));
            return null;
        }
    }, [props.bundles]);

    return (
        <loggerCtx.Provider value={props.logger}>
            <resolverCtx.Provider value={resolver}>
                <bundleCtx.Provider value={bundle}>{props.children}</bundleCtx.Provider>
            </resolverCtx.Provider>
        </loggerCtx.Provider>
    );
};
