import React from 'react';
import * as duckdb from '@duckdb/duckdb-wasm';

type PlatformProps = {
    children: React.ReactElement | React.ReactElement[];
    logger: duckdb.Logger;
    bundles: duckdb.DuckDBBundles;
};

const loggerCtx = React.createContext<duckdb.Logger | null>(null);
const bundleCtx = React.createContext<duckdb.DuckDBBundle | null>(null);
const launcherCtx = React.createContext<(() => void) | null>(null);
export const useDuckDBLauncher = (): (() => void) => React.useContext(launcherCtx)!;
export const useDuckDBLogger = (): duckdb.Logger => React.useContext(loggerCtx)!;
export const useDuckDBBundle = (): duckdb.DuckDBBundle => React.useContext(bundleCtx)!;

export const DuckDBPlatform: React.FC<PlatformProps> = (props: PlatformProps) => {
    const [bundle, setBundle] = React.useState<duckdb.DuckDBBundle | null>(null);
    const [launched, setLaunched] = React.useState<boolean>(false);
    const lock = React.useRef<boolean>(false);
    React.useEffect(() => {
        if (!launched || bundle != null || lock.current) return;
        lock.current = true;
        (async () => {
            try {
                const b = await duckdb.selectBundle(props.bundles);
                setBundle(b);
            } catch (e) {
                console.error(e);
            }
            lock.current = false;
        })();
    }, [launched, props.bundles]);
    const launcher = React.useCallback(() => setLaunched(true), [setLaunched]);
    return (
        <loggerCtx.Provider value={props.logger}>
            <launcherCtx.Provider value={launcher}>
                <bundleCtx.Provider value={bundle}>{props.children}</bundleCtx.Provider>
            </launcherCtx.Provider>
        </loggerCtx.Provider>
    );
};
