import * as React from 'react';
import * as model from './model';
import { connect } from 'react-redux';
import cn from 'classnames';
import EditorLoader from './components/editor';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import FormControl from 'react-bootstrap/FormControl';

import Select from 'react-select';

const dbOptions = [{ value: 'wasm', label: 'WebAssembly' }];

import styles from './explorer.module.css';

import icon_plus from '../static/svg/icons/plus.svg';
import icon_file from '../static/svg/icons/file-document-outline.svg';
import icon_timer from '../static/svg/icons/timer.svg';
import icon_list from '../static/svg/icons/view-list.svg';
import icon_file_box from '../static/svg/icons/file-table-box.svg';

interface Props {
    script: string;
}

class Explorer extends React.Component<Props> {
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
                            <Button className={styles.runScriptButton}>Run Script</Button>
                        </div>
                    </div>
                    <div className={styles.outputContainer}>
                        <div className={styles.outputControls} />
                        <div className={styles.outputStats}>
                            <div className={styles.outputStatsEntry}>
                                <div className={styles.outputStatsEntryIcon}>
                                    <svg width="18px" height="18px">
                                        <use xlinkHref={`${icon_list}#sym`} />
                                    </svg>
                                </div>
                                <div className={styles.outputStatsEntryValue}>115</div>
                            </div>
                            <div className={styles.outputStatsEntry}>
                                <div className={styles.outputStatsEntryIcon}>
                                    <svg width="18px" height="18px">
                                        <use xlinkHref={`${icon_timer}#sym`} />
                                    </svg>
                                </div>
                                <div className={styles.outputStatsEntryValue}>812 ms</div>
                            </div>
                            <div className={styles.outputStatsEntry}>
                                <div className={styles.outputStatsEntryIcon}>
                                    <svg width="18px" height="18px">
                                        <use xlinkHref={`${icon_file_box}#sym`} />
                                    </svg>
                                </div>
                                <div className={styles.outputStatsEntryValue}>8 KB</div>
                            </div>
                        </div>
                        <div className={styles.outputTable} />
                    </div>
                </div>
                <div className={styles.rightBar}></div>
            </div>
        );
    }
}

const mapStateToProps = (state: model.AppState) => ({
    script: state.script,
});

const mapDispatchToProps = (_dispatch: model.Dispatch) => ({});

export default connect(mapStateToProps, mapDispatchToProps)(Explorer);
