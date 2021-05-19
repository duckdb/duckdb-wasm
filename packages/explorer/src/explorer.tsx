import * as React from 'react';
import * as model from './model';
import * as arrow from 'apache-arrow';
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
import { useDropzone } from 'react-dropzone';

import Select from 'react-select';

import styles from './explorer.module.css';

import icon_plus from '../static/svg/icons/plus.svg';
import icon_file from '../static/svg/icons/file-document-outline.svg';
import icon_timer from '../static/svg/icons/timer.svg';
import icon_list from '../static/svg/icons/view-list.svg';
import icon_file_box from '../static/svg/icons/file-table-box.svg';

import { formatBytes, formatThousands } from './util';

const dbOptions = [{ value: 'wasm', label: 'In-Browser' }];

function FilePicker(props: Record<string, never>) {
    const { getRootProps, getInputProps } = useDropzone();

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
    script: string;
    result: arrow.Table | null;

    setQueryResult: (result: arrow.Table) => void;
}

class Explorer extends React.Component<Props> {
    _runScript = this.runScript.bind(this);

    public async runScript() {
        const conn = this.props.ctx.dbConnection;
        const result = await conn.runQuery(this.props.script);
        console.log(result);
        this.props.setQueryResult(result);
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
                        <div className={styles.scriptListEntry}>
                            <div className={styles.scriptListEntryIcon}>
                                <svg width="20px" height="20px">
                                    <use xlinkHref={`${icon_file}#sym`} />
                                </svg>
                            </div>
                            <div className={styles.scriptListEntryHeader}>HelloWorld.sql</div>
                            <div className={styles.scriptListEntryTimestamp}>19.05.2021, 10:21</div>
                        </div>
                    </div>
                </div>
                <div className={styles.center}>
                    <div className={styles.inputContainer}>
                        <div className={styles.scriptTabsContainer}>
                            <div className={cn(styles.scriptTab, styles.active)}>HelloWorld.sql</div>
                            <div className={styles.scriptTabsAdd}>
                                <svg width="18px" height="18px">
                                    <use xlinkHref={`${icon_plus}#sym`} />
                                </svg>
                            </div>
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
                        <div className={styles.outputTable}>
                            {this.props.result && <ArrowGrid table={this.props.result} />}
                        </div>
                    </div>
                </div>
                <div className={styles.rightBar}>
                    <div className={cn(styles.inspectorSection, styles.inspectorSectionBorder)}>
                        <div className={styles.inspectorSectionHeader}>
                            <div className={styles.inspectorSectionHeaderLogo}>
                                <svg width="20px" height="20px">
                                    <use xlinkHref={`${icon_file}#sym`} />
                                </svg>
                            </div>
                            <div className={styles.inspectorSectionHeaderName}>Tables</div>
                        </div>
                    </div>
                    <div className={cn(styles.inspectorSection, styles.inspectorSectionBorder)}>
                        <div className={styles.inspectorSectionHeader}>
                            <div className={styles.inspectorSectionHeaderLogo}>
                                <svg width="20px" height="20px">
                                    <use xlinkHref={`${icon_file}#sym`} />
                                </svg>
                            </div>
                            <div className={styles.inspectorSectionHeaderName}>Views</div>
                        </div>
                    </div>
                    <div className={styles.inspectorSection}>
                        <div className={styles.inspectorSectionHeader}>
                            <div className={styles.inspectorSectionHeaderLogo}>
                                <svg width="20px" height="20px">
                                    <use xlinkHref={`${icon_file}#sym`} />
                                </svg>
                            </div>
                            <div className={styles.inspectorSectionHeaderName}>Files</div>
                        </div>
                        <FilePicker />
                    </div>
                </div>
            </div>
        );
    }
}

const mapStateToProps = (state: model.AppState) => ({
    script: state.script,
    result: state.queryResult,
});

const mapDispatchToProps = (dispatch: model.Dispatch) => ({
    setQueryResult: (result: arrow.Table) => {
        model.mutate(dispatch, {
            type: model.StateMutationType.SET_QUERY_RESULT,
            data: result,
        });
    },
});

export default connect(mapStateToProps, mapDispatchToProps)(withAppContext(Explorer));
