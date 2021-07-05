import * as model from './model';
import * as shell from '../crate/pkg';
import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb.module.js';
import { useResizeDetector } from 'react-resize-detector';
import FileExplorer from './components/file_explorer';
import Overlay from './components/overlay';
import React from 'react';
import { connect } from 'react-redux';

import styles from './shell.module.css';
import 'xterm/css/xterm.css';

interface Props {
    resolveDatabase: () => Promise<duckdb.AsyncDuckDB>;

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
    public async readClipboardText(this: ShellRuntime): Promise<string> {
        return await navigator.clipboard.readText();
    }
    public async writeClipboardText(this: ShellRuntime, value: string) {
        return await navigator.clipboard.writeText(value);
    }
}

const ShellResizer = () => {
    const onResize = React.useCallback((width?: number, height?: number) => {
        shell.resize(width || 0, height || 0);
    }, []);
    const { ref } = useResizeDetector({ onResize });
    return <div ref={ref} className={styles.resizer} />;
};

class Shell extends React.Component<Props> {
    /// The terminal container
    protected _termContainer: React.RefObject<HTMLDivElement>;
    /// The runtime
    protected _runtime: ShellRuntime;
    /// The database
    protected _database: duckdb.AsyncDuckDB | null;
    /// The drop file handler
    protected _addFiles = this.addFiles.bind(this);

    /// Constructor
    constructor(props: Props) {
        super(props);
        this._termContainer = React.createRef();
        this._runtime = new ShellRuntime();
        this._database = null;
    }

    /// Drop files
    public async addFiles(files: FileList) {
        if (!this._database) return;
        const fileInfos: Array<model.FileInfo> = [];
        for (let i = 0; i < files.length; ++i) {
            const file = files.item(i)!;
            await this._database.dropFile(file.name);
            await this._database.registerFileHandle(file.name, file);
            fileInfos.push({
                name: file.name,
                url: null,
                size: 0,
                downloadProgress: 1.0,
            });
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
                <ShellResizer />
                <div ref={this._termContainer} className={styles.term_container}></div>
                {this.props.overlay === model.OverlayContent.FILE_EXPLORER && (
                    <Overlay>
                        <FileExplorer database={this._database} addFiles={this._addFiles} />
                    </Overlay>
                )}
            </div>
        );
    }

    public async resolveDatabase() {
        shell.writeln('Initializing DuckDB...');
        this._database = await this.props.resolveDatabase();
        shell.configureDatabase(this._database);
    }

    protected hasWebGL(): boolean {
        const canvas = document.createElement('canvas') as any;
        const supports = 'probablySupportsContext' in canvas ? 'probablySupportsContext' : 'supportsContext';
        if (supports in canvas) {
            return canvas[supports]('webgl2');
        }
        return 'WebGL2RenderingContext' in window;
    }

    public componentDidMount(): void {
        if (this._termContainer.current != null) {
            this._runtime._openFileExplorer = this.props.openFileViewer;
            shell.embed(this._termContainer.current, this._runtime, {
                backgroundColor: '#333',
                withWebGL: this.hasWebGL(),
            });
            this.resolveDatabase();
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
