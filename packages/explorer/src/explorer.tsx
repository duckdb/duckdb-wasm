import * as React from 'react';
import * as arrow from 'apache-arrow';
import * as data from './data';
import * as model from './model';
import Button from 'react-bootstrap/Button';
import EditorLoader from './components/editor';
import Form from 'react-bootstrap/Form';
import FormControl from 'react-bootstrap/FormControl';
import Immutable from 'immutable';
import InputGroup from 'react-bootstrap/InputGroup';
import Nav from 'react-bootstrap/Nav';
import axios from 'axios';
import cn from 'classnames';
import { ArrowGrid } from './components';
import { IAppContext, withAppContext } from './app_context';
import { connect } from 'react-redux';
import { useDropzone, FileRejection, DropEvent } from 'react-dropzone';

import Select from 'react-select';

import styles from './explorer.module.css';

import icon_file from '../static/svg/icons/file-document-outline.svg';
import icon_timer from '../static/svg/icons/timer.svg';
import icon_list from '../static/svg/icons/view-list.svg';
import icon_file_box from '../static/svg/icons/file-table-box.svg';

import { formatBytes, formatThousands } from './util';

const dbOptions = [{ value: 'wasm', label: 'In-Browser' }];

interface FileDropzoneProps {
    onDrop: <T extends File>(acceptedFiles: T[], fileRejections: FileRejection[], event: DropEvent) => void;
}

function FileDropzone(props: FileDropzoneProps) {
    const { getRootProps, getInputProps } = useDropzone({ onDrop: props.onDrop });

    return (
        <div {...getRootProps({ className: styles.fileDropzone })}>
            <input {...getInputProps()} />
            <p>
                Drop some files here,
                <br />
                or click to select them.
            </p>
        </div>
    );
}

interface Props {
    ctx: IAppContext;
    currentScript: model.Script | null;
    currentQueryResult: arrow.Table | null;
    scriptLibrary: Immutable.Map<string, model.Script>;
    peekedScript: string | null;
    registeredFiles: Immutable.Map<string, model.FileInfo>;

    setQueryResult: (result: arrow.Table) => void;
    registerFiles: (files: model.FileInfo[]) => void;
    registerLibraryScript: (script: model.Script) => void;
}

class Explorer extends React.Component<Props> {
    _peekScript = this.peekScript.bind(this);
    _runScript = this.runScript.bind(this);
    _dropFiles = this.dropFiles.bind(this);

    scriptLocks = new Map<string, boolean>();

    constructor(props: Props) {
        super(props);
        this.state = {
            scriptLocks: Immutable.Set(),
        };
    }

    public async runScript() {
        const conn = this.props.ctx.databaseConnection;
        if (!conn || !this.props.currentScript) return;
        const result = await conn.runQuery(this.props.currentScript.text);
        console.log(result);
        this.props.setQueryResult(result);
    }

    public async dropFiles(acceptedFiles: File[], fileRejections: FileRejection[], event: DropEvent) {
        const database = this.props.ctx.database;
        if (!database) return;
        for (const file of acceptedFiles) {
            await database.addFileBlob(file.name, file);
        }
        const fileInfos = acceptedFiles.map(f => ({
            name: f.name,
            url: `file://${f}`,
            downloadProgress: 1.0,
        }));
        console.log(fileInfos);
        this.props.registerFiles(fileInfos);
    }

    public renderScriptListEntry(metadata: data.ScriptMetadata) {
        return (
            <div key={metadata.name} className={styles.scriptListEntry}>
                <div className={styles.scriptListEntryIcon}>
                    <svg width="20px" height="20px">
                        <use xlinkHref={`${icon_file}#sym`} />
                    </svg>
                </div>
                <div className={styles.scriptListEntryHeader}>{metadata.name}</div>
            </div>
        );
    }

    public renderLoadedFileEntry(metadata: model.FileInfo) {
        return (
            <div key={metadata.name} className={styles.registeredFileListEntry}>
                <div className={styles.registeredFileListEntryIcon}>
                    <svg width="20px" height="20px">
                        <use xlinkHref={`${icon_file}#sym`} />
                    </svg>
                </div>
                <div className={styles.registeredFileListEntryHeader}>{metadata.name}</div>
            </div>
        );
    }

    public async peekScript(scriptName: string) {
        // Is already available?
        if (this.props.scriptLibrary.has(scriptName) || this.scriptLocks.has(scriptName)) {
            return;
        }
        // Unknown file?
        if (!data.FILES.has(scriptName)) {
            console.warn(`Unknown script: ${scriptName}`);
            return;
        }
        // Lock the script
        this.scriptLocks.set(scriptName, true);
        // Register script
        try {
            const file = data.FILES.get(scriptName)!;
            const response = await axios.request({
                method: 'get',
                url: file.url,
                responseType: 'text',
                onDownloadProgress: p => {},
            });
            const scriptText = await response.data();
            this.props.registerLibraryScript({
                name: scriptName,
                text: scriptText,
                tokens: [], // todo tokenize
            });
        } catch (e) {
            console.warn(e);
        }
    }

    public async downloadFile(file: data.FileMetadata) {
        // Make sure the database is available
        const database = this.props.ctx.database;
        if (!database) return;
        try {
            // Request the file
            const response = await axios.request({
                method: 'get',
                url: file.url,
                responseType: 'blob',
                onDownloadProgress: p => {
                    this.props.registerFiles([
                        {
                            name: file.name,
                            url: file.url,
                            downloadProgress: p,
                        },
                    ]);
                },
            });
            // Register the file blob
            await database.addFileBlob(file.name, response.data);
            this.props.registerFiles([
                {
                    name: file.name,
                    url: file.url,
                    downloadProgress: 1.0,
                },
            ]);
        } catch (e) {
            console.warn(e);
        }
    }

    public render() {
        return (
            <div className={styles.container}>
                <div className={styles.leftBar}>
                    <div className={styles.selectorHeader}>Select a Database</div>
                    <Select options={dbOptions} className={styles.selectorDrowdown} defaultValue={dbOptions[0]} />
                    <div className={styles.scriptSearchHeader}>Scripts</div>
                    <Form className={styles.scriptSearchForm}>
                        <InputGroup className="mb-2 mr-sm-2">
                            <FormControl id="inlineFormInputGroupUsername2" placeholder="Search..." />
                        </InputGroup>
                    </Form>
                    <div className={styles.scriptList}>
                        {Array.from(data.SCRIPTS.values()).map(s => this.renderScriptListEntry(s))}
                    </div>
                </div>
                <div className={styles.center}>
                    <div className={styles.inputContainer}>
                        <div className={styles.scriptTabsContainer}>
                            <div className={cn(styles.scriptTab, styles.active)}>HelloDuckDB.sql</div>
                        </div>
                        <div className={styles.inputCard} />
                        <div className={styles.editorContainer}>
                            <EditorLoader />
                        </div>
                        <div className={styles.inputControls}>
                            <Button className={styles.runScriptButton} onClick={this._runScript}>
                                Run Script
                            </Button>
                        </div>
                    </div>
                    <div className={styles.outputContainer}>
                        <div className={styles.outputControls}>
                            <Nav className={styles.outputTabs} variant="tabs" defaultActiveKey="output-results">
                                <Nav.Item>
                                    <Nav.Link eventKey="output-results">Results</Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link eventKey="output-plan">Plan</Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link eventKey="output-logs">Logs</Nav.Link>
                                </Nav.Item>
                            </Nav>
                        </div>
                        <div className={styles.outputStats}>
                            <div className={styles.outputStatsEntry}>
                                <div className={styles.outputStatsEntryIcon}>
                                    <svg width="18px" height="18px">
                                        <use xlinkHref={`${icon_list}#sym`} />
                                    </svg>
                                </div>
                                <div className={styles.outputStatsEntryValue}>
                                    {formatThousands(this.props.currentQueryResult?.length || 0)}
                                </div>
                            </div>
                            <div className={styles.outputStatsEntry}>
                                <div className={styles.outputStatsEntryIcon}>
                                    <svg width="18px" height="18px">
                                        <use xlinkHref={`${icon_timer}#sym`} />
                                    </svg>
                                </div>
                                <div className={styles.outputStatsEntryValue}>-</div>
                            </div>
                            <div className={styles.outputStatsEntry}>
                                <div className={styles.outputStatsEntryIcon}>
                                    <svg width="18px" height="18px">
                                        <use xlinkHref={`${icon_file_box}#sym`} />
                                    </svg>
                                </div>
                                <div className={styles.outputStatsEntryValue}>
                                    {formatBytes(this.props.currentQueryResult?.byteLength || 0)}
                                </div>
                            </div>
                        </div>
                        <div className={styles.outputResults}>
                            {this.props.currentQueryResult && (
                                <ArrowGrid className={styles.outputResultTable} table={this.props.currentQueryResult} />
                            )}
                        </div>
                    </div>
                </div>
                <div className={styles.rightBar}>
                    <div className={cn(styles.inspectorSection, styles.inspectorSectionBorder)}>
                        <FileDropzone onDrop={this._dropFiles} />
                    </div>
                    <div className={cn(styles.inspectorSection, styles.inspectorSectionBorder)}>
                        <div className={styles.inspectorSectionHeader}>Registered Files</div>

                        <div className={styles.registeredFileList}>
                            {this.props.registeredFiles
                                .toArray()
                                .map((entry: [string, model.FileInfo]) => this.renderLoadedFileEntry(entry[1]))}
                        </div>
                    </div>
                    <div className={styles.inspectorSection}>
                        <div className={styles.inspectorSectionHeader}>Recommended Files</div>
                        {this.props.registeredFiles.toArray().map((entry: [string, model.FileInfo]) => (
                            <div key={entry[0]} className={styles.inspectorFileEntry}>
                                {entry[0]}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
}

const mapStateToProps = (state: model.AppState) => ({
    currentScript: state.currentScript,
    currentQueryResult: state.currentQueryResult,
    scriptLibrary: state.scriptLibrary,
    peekedScript: state.peekedScript,
    registeredFiles: state.registeredFiles,
});

const mapDispatchToProps = (dispatch: model.Dispatch) => ({
    setQueryResult: (result: arrow.Table) => {
        model.mutate(dispatch, {
            type: model.StateMutationType.SET_CURRENT_QUERY_RESULT,
            data: result,
        });
    },
    registerLibraryScript: (script: model.Script) => {
        model.mutate(dispatch, {
            type: model.StateMutationType.REGISTER_LIBRARY_SCRIPT,
            data: script,
        });
    },
    registerFiles: (files: model.FileInfo[]) => {
        model.mutate(dispatch, {
            type: model.StateMutationType.REGISTER_FILES,
            data: files,
        });
    },
});

export default connect(mapStateToProps, mapDispatchToProps)(withAppContext(Explorer));
