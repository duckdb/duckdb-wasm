import * as model from '../model';
import Button from 'react-bootstrap/Button';
import Immutable from 'immutable';
import React from 'react';
import styles from './file_explorer.module.css';
import FileDropzone from './file_dropzone';
import { FileRejection, DropEvent } from 'react-dropzone';
import { connect } from 'react-redux';
import { AsyncDuckDB } from '@duckdb/duckdb-wasm/dist/duckdb.module.js';

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
                <div className={styles.registeredFileList}>
                    {this.props.registeredFiles
                        .toArray()
                        .map((entry: [string, model.FileInfo]) => this.renderLoadedFileEntry(entry[1]))}
                </div>
                <FileDropzone onDrop={this.props.onDrop} />
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
