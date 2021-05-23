import * as React from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { AutoSizer } from '../util/autosizer';
import { connect } from 'react-redux';
import { IAppContext, withAppContext } from '../app_context';
import * as model from '../model';
import classNames from 'classnames';

import { theme as monaco_theme } from './editor_theme_light';
import styles from './editor.module.css';

type Props = {
    ctx: IAppContext;
    className?: string;
    script: model.Script | null;

    updateScript: (script: model.Script) => void;
};

/** Dummy state to propagate the line number through the TokensProvider API.
 *  We rely on the fact here that the model passes this state from line to line sequentially.
 *  Ref: https://microsoft.github.io/monaco-editor/api/interfaces/monaco.languages.istate.html
 *
 *  This is hacky but the tokenize() function gets a single string as input instead of a line number.
 *  That is super useless to us since we already have all the tokens.
 */
class TokensProviderState implements monaco.languages.IState {
    /** Constructor */
    constructor(protected _lineNumber: number = -1) {}
    /** Get the line number */
    public get lineNumber() {
        return this._lineNumber;
    }
    public advance() {
        this._lineNumber += 1;
    }
    /** Equality check */
    equals(other: TokensProviderState) {
        return this._lineNumber == other._lineNumber;
    }
    /** Clone the state */
    clone() {
        return new TokensProviderState(this._lineNumber);
    }
}

class TokensProvider implements monaco.languages.TokensProvider {
    /// The redux store
    _store: model.AppReduxStore;

    constructor(store: model.AppReduxStore) {
        this._store = store;
    }

    getInitialState(): monaco.languages.IState {
        return new TokensProviderState();
    }

    tokenize(_line: string, state: TokensProviderState): monaco.languages.ILineTokens {
        const result: monaco.languages.ILineTokens = {
            tokens: [],
            endState: state,
        };
        return result;
    }
}

class Editor extends React.Component<Props> {
    // The monaco container
    protected monacoContainer: HTMLDivElement | null;
    // The monaco editor
    protected editor: monaco.editor.IStandaloneCodeEditor | null;
    // Pending editor resize
    protected pendingEditorResize: number | null;

    /// Constructor
    constructor(props: Props) {
        super(props);
        this.monacoContainer = null;
        this.editor = null;
        this.pendingEditorResize = null;
    }

    /// The component did mount, init monaco
    public componentDidMount() {
        this.initMonaco();
    }

    /// The component did update, sync monaco
    public componentDidUpdate(_prevProps: Props) {
        // Editor not set?
        if (!this.editor) {
            return;
        }
        // Value changed?
        if (this.editor && this.props.script?.text && this.editor.getValue() !== this.props.script?.text) {
            this.editor.setValue(this.props.script.text);
        }
        // Layout editor
        if (this.monacoContainer) {
            this.resizeEditorDelayed(this.monacoContainer.offsetHeight, this.monacoContainer.offsetWidth);
        }
    }

    public componentWillUnmount() {
        this.destroyMonaco();
    }

    /// Init the monaco editor
    protected initMonaco() {
        if (this.monacoContainer) {
            monaco.languages.register({ id: 'sql' });
            monaco.languages.setTokensProvider('sql', new TokensProvider(this.props.ctx.store));
            monaco.editor.defineTheme('sql', monaco_theme);
            monaco.editor.setTheme('sql');

            this.editor = monaco.editor.create(this.monacoContainer, {
                fontSize: 13,
                language: 'sql',
                value: this.props.script?.text || '',
                links: false,
                wordWrap: 'on',
                minimap: {
                    enabled: false,
                },
                scrollBeyondLastLine: false,
            });
            this.editor.setPosition({ column: 0, lineNumber: 0 });
            this.editor.focus();

            // Finalize the editor
            this.editorDidMount();
        }
    }

    /// Destroy the monaco editor
    protected destroyMonaco() {
        if (this.editor !== null) {
            this.editor.dispose();
        }
    }

    /// The editor did mount, register the event handler
    public editorDidMount() {
        const editor = this.editor!;
        editor.onDidChangeModelContent(_event => {
            if (editor.getValue() != this.props.script?.text) {
                this.props.updateScript({
                    name: this.props.script?.name || 'HelloDuckDB.sql',
                    text: editor.getValue(),
                    tokens: [], // XXX
                });
            }
        });
        if (this.monacoContainer) {
            this.resizeEditorDelayed(this.monacoContainer.offsetHeight, this.monacoContainer.offsetWidth);
        }
    }

    /// Resize the editor with a delay since this is expensive
    protected resizeEditorDelayed(height: number, width: number) {
        const delayMs = 100;
        if (this.pendingEditorResize != null) {
            clearTimeout(this.pendingEditorResize);
        }
        this.pendingEditorResize = window.setTimeout(() => {
            this.resizeEditor(height, width);
        }, delayMs);
    }

    /// Resize the editor
    protected resizeEditor(height: number, width: number) {
        if (this.editor) {
            this.editor.layout({
                height: height,
                width: width,
            });
        }
    }

    /// Render the monaco editor
    render() {
        return (
            <div className={classNames(styles.editor, this.props.className)}>
                <AutoSizer
                    onResize={(size: { height: number; width: number }) => {
                        this.resizeEditorDelayed(size.height, size.width);
                    }}
                >
                    {_size => <div className={styles.editorMonaco} ref={ref => (this.monacoContainer = ref)} />}
                </AutoSizer>
            </div>
        );
    }

    public updateMarkers() {
        const data = this.editor?.getModel();
        if (!data) return;

        monaco.editor.setModelMarkers(data, 'sql', []);

        // XXX Get syntax errors from DuckDB
        // const markers: monaco.editor.IMarkerData[] = [];
        // for (let i = 0; i < program.buffer.errorsLength(); ++i) {
        //     const error = program.buffer.errors(i)!;
        //     const location = error.location()!;
        //     const begin = data.getPositionAt(location.offset());
        //     const startLineNumber = begin.lineNumber;
        //     const startColumn = begin.column;
        //     const end = data.getPositionAt(location.offset() + location.length());
        //     const endLineNumber = end.lineNumber;
        //     const endColumn = end.column;
        //     if (!startLineNumber || !startColumn || !endLineNumber || !endColumn) {
        //         return undefined;
        //     }
        //     markers.push({
        //         startLineNumber,
        //         startColumn,
        //         endLineNumber,
        //         endColumn,
        //         message: error.message() ?? '',
        //         severity: monaco.MarkerSeverity.Error,
        //     });
        // }
        // monaco.editor.setModelMarkers(data, 'SQL', markers);
    }
}

const mapStateToProps = (state: model.AppState) => ({
    script: state.currentScript,
});

const mapDispatchToProps = (dispatch: model.Dispatch) => ({
    updateScript: (script: model.Script) => {
        model.mutate(dispatch, {
            type: model.StateMutationType.SET_CURRENT_SCRIPT,
            data: script,
        });
    },
});

export default connect(mapStateToProps, mapDispatchToProps)(withAppContext(Editor));
