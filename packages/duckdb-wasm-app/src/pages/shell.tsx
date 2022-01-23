import * as duckdb from '@duckdb/duckdb-wasm';
import * as shell from '@duckdb/duckdb-wasm-shell';
import React from 'react';

import styles from './shell.module.css';

import shell_wasm from '@duckdb/duckdb-wasm-shell/dist/shell_bg.wasm';

interface ShellProps {
    backgroundColor?: string;
    padding?: number[];
    borderRadius?: number[];
    resolveDatabase: (p: duckdb.InstantiationProgressHandler) => Promise<duckdb.AsyncDuckDB>;
}

export const Shell: React.FC<ShellProps> = (props: ShellProps) => {
    const termContainer = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        console.assert(termContainer.current != null);
        shell.embed({
            wasmSource: shell_wasm,
            container: termContainer.current!,
            resolveDatabase: (p: duckdb.InstantiationProgressHandler) => props.resolveDatabase(p),
        });
    }, []);

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
