import * as React from 'react';
import * as model from './model';
import { connect } from 'react-redux';
import EditorLoader from './components/editor';

import styles from './explorer.module.css';

interface Props {
    script: string;
}

class Explorer extends React.Component<Props> {
    public render() {
        return (
            <div className={styles.container}>
                <div className={styles.leftBar}></div>
                <div className={styles.center}>
                    <div className={styles.inputContainer}>
                        <div className={styles.editorContainer}>
                            <EditorLoader />
                        </div>
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
