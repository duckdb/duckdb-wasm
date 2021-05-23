import Immutable from 'immutable';
import * as React from 'react';
import * as model from './model';
import * as arrow from 'apache-arrow';
import * as scripts from './data';
import { ArrowGrid } from './components';
import { connect } from 'react-redux';
import cn from 'classnames';
import { IAppContext, withAppContext } from './app_context';
import EditorLoader from './components/editor';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import FormControl from 'react-bootstrap/FormControl';
import Nav from 'react-bootstrap/Nav';
import { useDropzone, FileRejection, DropEvent } from 'react-dropzone';

import Select from 'react-select';

import styles from './explorer.module.css';

import icon_file from '../static/svg/icons/file-document-outline.svg';
import icon_timer from '../static/svg/icons/timer.svg';
import icon_list from '../static/svg/icons/view-list.svg';
import icon_file_box from '../static/svg/icons/file-table-box.svg';

import { formatBytes, formatThousands } from './util';

const dbOptions = [{ value: 'wasm', label: 'In-Browser' }];

interface FilePickerProps {
    onDrop: <T extends File>(acceptedFiles: T[], fileRejections: FileRejection[], event: DropEvent) => void;
}

function FilePicker(props: FilePickerProps) {
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
    script: model.Script | null;
    result: arrow.Table | null;
    files: Immutable.Map<string, model.FileInfo>;

    setQueryResult: (result: arrow.Table) => void;
    registerFiles: (files: model.FileInfo[]) => void;
}

class Explorer extends React.Component<Props> {
    _runScript = this.runScript.bind(this);
    _registerFiles = this.registerFiles.bind(this);

    public async runScript() {
        const conn = this.props.ctx.databaseConnection;
        if (!conn || !this.props.script) return;
        const result = await conn.runQuery(this.props.script.text);
        console.log(result);
        this.props.setQueryResult(result);
    }

    public async registerFiles(acceptedFiles: File[], fileRejections: FileRejection[], event: DropEvent) {
        const database = this.props.ctx.database;
        if (!database) return;
        for (const file of acceptedFiles) {
            await database.addFileBlob(file.name, file);
        }
        const fileInfos = acceptedFiles.map(f => ({
            name: f.name,
            sizeBytes: f.size,
        }));
        console.log(fileInfos);
        this.props.registerFiles(fileInfos);
    }

    public renderScriptListEntry(metadata: scripts.ScriptMetadata) {
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

    public selectScript() {}

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
                        {Array.from(scripts.SCRIPTS.values()).map(s => this.renderScriptListEntry(s))}
                    </div>
                </div>
                <div className={styles.center}>
                    <div className={styles.inputContainer}>
                        <div className={styles.scriptTabsContainer}>
                            <div className={cn(styles.scriptTab, styles.active)}>HelloWorld.sql</div>
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
                                    {formatThousands(this.props.result?.length || 0)}
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
                                    {formatBytes(this.props.result?.byteLength || 0)}
                                </div>
                            </div>
                        </div>
                        <div className={styles.outputResults}>
                            {this.props.result && (
                                <ArrowGrid className={styles.outputResultTable} table={this.props.result} />
                            )}
                        </div>
                    </div>
                </div>
                <div className={styles.rightBar}>
                    <div className={cn(styles.inspectorSection, styles.inspectorSectionBorder)}>
                        <FilePicker onDrop={this._registerFiles} />
                    </div>
                    <div className={cn(styles.inspectorSection, styles.inspectorSectionBorder)}>
                        <div className={styles.inspectorSectionHeader}>Registered Files</div>

                        <div className={styles.registeredFileList}>
                            {this.props.files
                                .toArray()
                                .map((entry: [string, model.FileInfo]) => this.renderLoadedFileEntry(entry[1]))}
                        </div>
                    </div>
                    <div className={styles.inspectorSection}>
                        <div className={styles.inspectorSectionHeader}>Recommended Files</div>
                        {this.props.files.toArray().map((entry: [string, model.FileInfo]) => (
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
    script: state.script,
    result: state.queryResult,
    files: state.registeredFiles,
});

const mapDispatchToProps = (dispatch: model.Dispatch) => ({
    setQueryResult: (result: arrow.Table) => {
        model.mutate(dispatch, {
            type: model.StateMutationType.SET_QUERY_RESULT,
            data: result,
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
