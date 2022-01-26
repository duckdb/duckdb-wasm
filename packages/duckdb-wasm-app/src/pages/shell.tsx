import * as duckdb from '@duckdb/duckdb-wasm';
import * as shell from '@duckdb/duckdb-wasm-shell';
import * as database from '@duckdb/react-duckdb';
import React from 'react';

import styles from './shell.module.css';

import shell_wasm from '@duckdb/duckdb-wasm-shell/dist/shell_bg.wasm';

interface ShellProps {
    backgroundColor?: string;
    padding?: number[];
    borderRadius?: number[];
}

export const Shell: React.FC<ShellProps> = (props: ShellProps) => {
    const termContainer = React.useRef<HTMLDivElement | null>(null);
    const db = database.useDuckDB();
    const dbStatus = database.useDuckDBStatus();
    const dbLauncher = database.useDuckDBLauncher();
    const shellDBResolver = React.useRef<[(db: duckdb.AsyncDuckDB) => void, (err: any) => void] | null>(null);
    const shellStatusUpdater = React.useRef<duckdb.InstantiationProgressHandler | null>(null);

    // Launch DuckDB
    React.useEffect(() => {
        dbLauncher();
    });

    // Embed the shell into the term container
    React.useEffect(() => {
        console.assert(termContainer.current != null);
        shell.embed({
            shellModule: shell_wasm,
            container: termContainer.current!,
            resolveDatabase: (p: duckdb.InstantiationProgressHandler) => {
                if (db != null) {
                    return Promise.resolve(db);
                }
                shellStatusUpdater.current = p;
                const result = new Promise<duckdb.AsyncDuckDB>((resolve, reject) => {
                    shellDBResolver.current = [resolve, reject];
                });
                return result;
            },
        });
    }, []);

    // Propagate the react state updates to the wasm progress handler
    React.useEffect(() => {
        if (db) {
            if (shellDBResolver.current != null) {
                const resolve = shellDBResolver.current[0];
                shellDBResolver.current = null;
                resolve(db);
            }
        } else if (dbStatus && dbStatus.instantiationError) {
            if (shellDBResolver.current != null) {
                const reject = shellDBResolver.current[1];
                shellDBResolver.current = null;
                reject(db);
            }
        } else if (dbStatus && dbStatus.instantiationProgress) {
            if (shellStatusUpdater.current) {
                shellStatusUpdater.current(dbStatus.instantiationProgress);
            }
        }
    }, [dbStatus, db]);

    const style: React.CSSProperties = {
        padding: props.padding ? `${props.padding.map(p => `${p}px`).join(' ')}` : '0px',
        borderRadius: props.borderRadius ? `${props.borderRadius.map(p => `${p}px`).join(' ')}` : '0px',
        backgroundColor: props.backgroundColor || 'transparent',
    };
    return (
        <div className={styles.root} style={style}>
            <div ref={termContainer} className={styles.term_container} />
        </div>
    );
};
