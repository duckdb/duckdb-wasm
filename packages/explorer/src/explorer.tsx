import * as React from 'react';
import * as model from './model';
import { connect } from 'react-redux';
import cn from 'classnames';
import EditorLoader from './components/editor';
import Button from 'react-bootstrap/Button';

import Select from 'react-select';

const dbOptions = [{ value: 'wasm', label: 'In-Browser' }];

import styles from './explorer.module.css';

import icon_plus from '../static/svg/icons/plus.svg';

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
                </div>
                <div className={styles.center}>
                    <div className={styles.inputContainer}>
                        <div className={styles.scriptTabsContainer}>
                            <div className={cn(styles.scriptTab, styles.active)}>HelloWorld.sql</div>
                            <div className={styles.scriptTabsAdd}>
                                <svg className={styles.scriptTabsAddIcon} width="18px" height="18px">
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
                    <div className={styles.outputContainer}></div>
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
