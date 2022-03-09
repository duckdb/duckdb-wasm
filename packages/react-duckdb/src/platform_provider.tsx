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

    const inFlight = React.useRef<Promise<duckdb.DuckDBBundle | null> | null>(null);
    const resolver = React.useCallback(async () => {
        if (bundle.error) return null;
        if (bundle.value) return bundle.value;
        if (inFlight.current) return await inFlight.current;
        inFlight.current = (async () => {
            try {
                setBundle(b => b.updateRunning());
                const next = await duckdb.selectBundle(props.bundles);
                inFlight.current = null;
                setBundle(b => b.completeWith(next));
                return next;
            } catch (e: any) {
                inFlight.current = null;
                console.error(e);
                setBundle(b => b.failWith(e));
                return null;
            }
        })();
        return await inFlight.current;
    }, [props.bundles]);

    return (
        <loggerCtx.Provider value={props.logger}>
            <resolverCtx.Provider value={resolver}>
                <bundleCtx.Provider value={bundle}>{props.children}</bundleCtx.Provider>
            </resolverCtx.Provider>
        </loggerCtx.Provider>
    );
};
