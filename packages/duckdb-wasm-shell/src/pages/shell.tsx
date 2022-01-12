import * as shell from '../../crate/pkg';
import * as duckdb from '@duckdb/duckdb-wasm';
import React from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { HistoryStore } from '../utils/history_store';
import { isSafari } from '../utils/platform';
import { pickFiles } from '../utils/files';

import styles from './shell.module.css';

interface ShellProps {
    backgroundColor?: string;
    padding?: number[];
    borderRadius?: number[];

    resolveDatabase: () => Promise<duckdb.AsyncDuckDB>;
}

const hasWebGL = (): boolean => {
    if (isSafari) {
        return false;
    }
    const canvas = document.createElement('canvas') as any;
    const supports = 'probablySupportsContext' in canvas ? 'probablySupportsContext' : 'supportsContext';
    if (supports in canvas) {
        return canvas[supports]('webgl2');
    }
    return 'WebGL2RenderingContext' in window;
};

class ShellRuntime {
    constructor(protected _history: HistoryStore, protected _pickFiles: () => Promise<number>) {}

    public async pickFiles(this: ShellRuntime): Promise<number> {
        return await this._pickFiles();
    }
    public async readClipboardText(this: ShellRuntime): Promise<string> {
        return await navigator.clipboard.readText();
    }
    public async writeClipboardText(this: ShellRuntime, value: string) {
        return await navigator.clipboard.writeText(value);
    }
    public async pushInputToHistory(this: ShellRuntime, value: string) {
        this._history.push(value);
    }
}

const ShellResizer = () => {
    const onResize = React.useCallback((width?: number, height?: number) => {
        shell.resize(width || 0, height || 0);
    }, []);
    const { ref } = useResizeDetector({ onResize });
    return <div ref={ref} className={styles.resizer} />;
};

export const Shell: React.FC<ShellProps> = (props: ShellProps) => {
    const termContainer = React.useRef<HTMLDivElement | null>(null);
    const history = React.useRef<HistoryStore>(new HistoryStore());
    const database = React.useRef<duckdb.AsyncDuckDB | null>(null);

    const runtime = React.useRef<ShellRuntime>(
        new ShellRuntime(history.current, async (): Promise<number> => {
            if (!database.current) return 0;
            const db = database.current;
            return await pickFiles(db);
        }),
    );

    React.useEffect(() => {
        console.assert(termContainer.current != null);
        shell.embed(termContainer.current!, runtime.current, {
            backgroundColor: '#333',
            withWebGL: hasWebGL(),
        });
        (async () => {
            const step = async (label: string, work: () => Promise<void>) => {
                const TERM_BOLD = '\x1b[1m';
                const TERM_NORMAL = '\x1b[m';
                shell.writeln(`${TERM_BOLD}[ RUN   ]${TERM_NORMAL} ${label}`);
                await work();
                shell.writeln(`${TERM_BOLD}[ OK    ]${TERM_NORMAL} ${label}`);
            };
            await step('Resolving DuckDB Bundle', async () => {
                database.current = await props.resolveDatabase();
            });
            await step('Loading Shell History', async () => {
                await history.current.open();
                const [hist, histCursor] = await history.current.load();
                shell.loadHistory(hist, histCursor);
            });
            await step('Attaching Shell', async () => {
                shell.configureDatabase(database.current);
            });
        })();
    }, []);

    const style: React.CSSProperties = {
        padding: props.padding ? `${props.padding.map(p => `${p}px`).join(' ')}` : '0px',
        borderRadius: props.borderRadius ? `${props.borderRadius.map(p => `${p}px`).join(' ')}` : '0px',
        backgroundColor: props.backgroundColor || 'transparent',
    };
    return (
        <div className={styles.root} style={style}>
            <ShellResizer />
            <div ref={termContainer} className={styles.term_container}></div>
        </div>
    );
};
