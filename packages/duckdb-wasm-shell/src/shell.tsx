import * as model from './model';
import * as shell from '../crate/pkg';
import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb.module.js';
import FileExplorer from './components/file_explorer';
import Overlay from './components/overlay';
import React from 'react';
import { connect } from 'react-redux';

import styles from './shell.module.css';
import 'xterm/css/xterm.css';

import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb.wasm';
import duckdb_wasm_next from '@duckdb/duckdb-wasm/dist/duckdb-next.wasm';
import duckdb_wasm_next_coi from '@duckdb/duckdb-wasm/dist/duckdb-next-coi.wasm';

const DUCKDB_BUNDLES: duckdb.DuckDBBundles = {
    asyncDefault: {
        mainModule: duckdb_wasm,
        mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-async.worker.js', import.meta.url).toString(),
    },
    asyncNext: {
        mainModule: duckdb_wasm_next,
        mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-async-next.worker.js', import.meta.url).toString(),
    },
    asyncNextCOI: {
        mainModule: duckdb_wasm_next_coi,
        mainWorker: new URL(
            '@duckdb/duckdb-wasm/dist/duckdb-browser-async-next-coi.worker.js',
            import.meta.url,
        ).toString(),
        pthreadWorker: new URL(
            '@duckdb/duckdb-wasm/dist/duckdb-browser-async-next-coi.pthread.worker.js',
            import.meta.url,
        ).toString(),
    },
};

interface Props {
    workerURL?: string;

    backgroundColor?: string;
    padding?: number[];
    borderRadius?: number[];
    overlay: model.OverlayContent | null;

    openFileViewer: () => void;
    registerFiles: (files: model.FileInfo[]) => void;
}

class ShellRuntime {
    public _openFileExplorer: (() => void) | null = null;

    public openFileExplorer(this: ShellRuntime): void {
        if (this._openFileExplorer) {
            this._openFileExplorer();
        } else {
            shell.resumeAfterInput(shell.ShellInputContext.FileInput);
        }
    }
}

class Shell extends React.Component<Props> {
    /// The terminal container
    protected termContainer: React.RefObject<HTMLDivElement>;
    /// The runtime
    protected runtime: ShellRuntime;
    /// The database
    protected database: duckdb.AsyncDuckDB | null;
    /// The drop file handler
    protected addFiles_ = this.addFiles.bind(this);

    /// Constructor
    constructor(props: Props) {
        super(props);
        this.termContainer = React.createRef();
        this.runtime = new ShellRuntime();
        this.database = null;
    }

    /// Drop files
    public async addFiles(files: FileList) {
        if (!this.database) return;
        const fileInfos: Array<model.FileInfo> = [];
        for (let i = 0; i < files.length; ++i) {
            const file = files.item(i)!;
            await this.database.registerFileHandle(file.name, file);
            fileInfos.push({
                name: file.name,
                url: null,
                size: 0,
                downloadProgress: 1.0,
            });
            await this.database.enableFileStatistics(file.name, true);
        }
        this.props.registerFiles(fileInfos);
    }

    /// Render the demo
    public render(): React.ReactElement {
        const style: React.CSSProperties = {
            padding: this.props.padding ? `${this.props.padding.map(p => `${p}px`).join(' ')}` : '0px',
            borderRadius: this.props.borderRadius ? `${this.props.borderRadius.map(p => `${p}px`).join(' ')}` : '0px',
            backgroundColor: this.props.backgroundColor || 'transparent',
        };
        return (
            <div className={styles.root} style={style}>
                <div ref={this.termContainer} className={styles.term_container}></div>
                {this.props.overlay === model.OverlayContent.FILE_EXPLORER && (
                    <Overlay>
                        <FileExplorer database={this.database} addFiles={this.addFiles_} />
                    </Overlay>
                )}
            </div>
        );
    }

    public async initDuckDB() {
        const config = await duckdb.configure(DUCKDB_BUNDLES);
        const worker = new Worker(config.mainWorker!);
        const logger = new duckdb.ConsoleLogger();
        this.database = new duckdb.AsyncDuckDB(logger, worker);
        this.database.open(config.mainModule, config.pthreadWorker).then(_ => shell.configureDatabase(this.database));
    }

    public componentDidMount(): void {
        if (this.termContainer.current != null) {
            this.runtime._openFileExplorer = this.props.openFileViewer;
            shell.embed(this.termContainer.current, this.runtime, {
                backgroundColor: '#333',
            });
            this.initDuckDB();
        }
    }

    public componentWillUnmount(): void {}
}

const mapStateToProps = (state: model.AppState) => ({
    overlay: state.overlay,
});

const mapDispatchToProps = (dispatch: model.Dispatch) => ({
    openFileViewer: () =>
        dispatch({
            type: model.StateMutationType.OVERLAY_OPEN,
            data: model.OverlayContent.FILE_EXPLORER,
        }),
    registerFiles: (files: model.FileInfo[]) =>
        dispatch({
            type: model.StateMutationType.REGISTER_FILES,
            data: files,
        }),
});

export default connect(mapStateToProps, mapDispatchToProps)(Shell);
