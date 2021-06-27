import * as model from '../model';
import Button from 'react-bootstrap/Button';
import Immutable from 'immutable';
import React from 'react';
import styles from './file_explorer.module.css';
import { FileRejection, DropEvent } from 'react-dropzone';
import { connect } from 'react-redux';
import { AsyncDuckDB } from '@duckdb/duckdb-wasm/dist/duckdb.module.js';

import icon_close from '../../static/svg/icons/close.svg';
import icon_file from '../../static/svg/icons/file-document-outline.svg';

interface Props {
    children?: React.ReactElement;
    registeredFiles: Immutable.Map<string, model.FileInfo>;
    database: AsyncDuckDB | null;

    closeOverlay: () => void;
    onDrop: <T extends File>(acceptedFiles: T[], fileRejections: FileRejection[], event: DropEvent) => void;
}

class FileExplorer extends React.Component<Props> {
    public renderLoadedFileEntry(metadata: model.FileInfo) {
        return (
            <div key={metadata.name} className={styles.registered_file_list_entry}>
                <div className={styles.registered_file_list_entryIcon}>
                    <svg width="20px" height="20px">
                        <use xlinkHref={`${icon_file}#sym`} />
                    </svg>
                </div>
                <div className={styles.registered_file_list_entry_header}>{metadata.name}</div>
            </div>
        );
    }

    public render(): React.ReactElement {
        return (
            <div className={styles.root}>
                <div className={styles.header}>
                    <div className={styles.header_title}>Files</div>
                    <div className={styles.close} onClick={this.props.closeOverlay}>
                        <svg width="20px" height="20px">
                            <use xlinkHref={`${icon_close}#sym`} />
                        </svg>
                    </div>
                </div>
                <div className={styles.registered_file_list}>
                    {this.props.registeredFiles
                        .toArray()
                        .map((entry: [string, model.FileInfo]) => this.renderLoadedFileEntry(entry[1]))}
                    {this.props.registeredFiles.size == 0 && <div className={styles.no_files}>No files registered</div>}
                </div>
                <div className={styles.footer_actions}>
                    <Button
                        className={styles.footer_action}
                        variant="primary"
                        size="sm"
                        onClick={this.props.closeOverlay}
                    >
                        Local File
                    </Button>
                    <Button
                        className={styles.footer_action}
                        variant="primary"
                        size="sm"
                        onClick={this.props.closeOverlay}
                        disabled
                    >
                        HTTP File
                    </Button>
                </div>
            </div>
        );
    }
}

const mapStateToProps = (state: model.AppState) => ({
    registeredFiles: state.registeredFiles,
});

const mapDispatchToProps = (dispatch: model.Dispatch) => ({
    closeOverlay: () =>
        dispatch({
            type: model.StateMutationType.OVERLAY_CLOSE,
            data: model.OverlayContent.FILE_EXPLORER,
        }),
});

export default connect(mapStateToProps, mapDispatchToProps)(FileExplorer);
