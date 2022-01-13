import * as duckdb from '@duckdb/duckdb-wasm';
import * as shell from '../crate/pkg';
import { HistoryStore } from './utils/history_store';
import { isSafari } from './platform';
import { pickFiles } from './utils/files';

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
    database: duckdb.AsyncDuckDB | null;
    history: HistoryStore;
    resizeHandler: (_event: UIEvent) => void;

    constructor(protected container: HTMLDivElement) {
        this.database = null;
        this.history = new HistoryStore();
        this.resizeHandler = (_event: UIEvent) => {
            const rect = container.getBoundingClientRect();
            shell.resize(rect.width, rect.height);
        };
    }

    public async pickFiles(this: ShellRuntime): Promise<number> {
        if (this.database == null) {
            console.warn('database is not initialized');
            return 0;
        }
        return await pickFiles(this.database!);
    }
    public async readClipboardText(this: ShellRuntime): Promise<string> {
        return await navigator.clipboard.readText();
    }
    public async writeClipboardText(this: ShellRuntime, value: string) {
        return await navigator.clipboard.writeText(value);
    }
    public async pushInputToHistory(this: ShellRuntime, value: string) {
        this.history.push(value);
    }
}

interface ShellProps {
    wasmSource: RequestInfo | URL | Response | BufferSource | WebAssembly.Module;
    container: HTMLDivElement;
    resolveDatabase: () => Promise<duckdb.AsyncDuckDB>;
}

export async function embed(props: ShellProps) {
    // Initialize the shell
    await shell.default(props.wasmSource);

    // Embed into container
    const runtime = new ShellRuntime(props.container);
    shell.embed(props.container!, runtime, {
        backgroundColor: '#333',
        withWebGL: hasWebGL(),
    });
    props.container.onresize = runtime.resizeHandler;

    // Attach to the database
    const step = async (label: string, work: () => Promise<void>) => {
        const TERM_BOLD = '\x1b[1m';
        const TERM_NORMAL = '\x1b[m';
        shell.writeln(`${TERM_BOLD}[ RUN   ]${TERM_NORMAL} ${label}`);
        await work();
        shell.writeln(`${TERM_BOLD}[ OK    ]${TERM_NORMAL} ${label}`);
    };
    await step('Resolving DuckDB', async () => {
        runtime.database = await props.resolveDatabase();
    });
    await step('Loading Shell History', async () => {
        await runtime.history.open();
        const [hist, histCursor] = await runtime.history.load();
        shell.loadHistory(hist, histCursor);
    });
    await step('Attaching Shell', async () => {
        shell.configureDatabase(runtime.database);
    });
}
