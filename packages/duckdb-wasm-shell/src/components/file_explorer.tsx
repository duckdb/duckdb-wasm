import * as model from '../model';
import React from 'react';
import styles from './file_explorer.module.css';
import Button from 'react-bootstrap/Button';
import { connect } from 'react-redux';

interface Props {
    children?: React.ReactElement;
    closeOverlay: () => void;
}

class FileExplorer extends React.Component<Props> {
    public render(): React.ReactElement {
        return (
            <div className={styles.root}>
                <div className={styles.header}>
                    <div className={styles.header_title}>Files</div>
                    <Button
                        className={styles.header_action}
                        variant="primary"
                        size="sm"
                        onClick={this.props.closeOverlay}
                    >
                        Done
                    </Button>
                </div>
            </div>
        );
    }
}

const mapStateToProps = (state: model.AppState) => ({});

const mapDispatchToProps = (dispatch: model.Dispatch) => ({
    closeOverlay: () =>
        dispatch({
            type: model.StateMutationType.OVERLAY_CLOSE,
            data: model.OverlayContent.FILE_EXPLORER,
        }),
});

export default connect(mapStateToProps, mapDispatchToProps)(FileExplorer);
