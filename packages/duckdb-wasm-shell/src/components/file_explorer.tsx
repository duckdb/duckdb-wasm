import * as model from '../model';
import Button from 'react-bootstrap/Button';
import Immutable from 'immutable';
import React, { ChangeEvent } from 'react';
import styles from './file_explorer.module.css';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { AsyncDuckDB } from '@duckdb/duckdb-wasm/dist/duckdb.module.js';
import { formatBytes } from '../utils/format';

import icon_close from '../../static/svg/icons/close.svg';
import icon_data_matrix_scan from '../../static/svg/icons/data-matrix-scan.svg';
import icon_minus from '../../static/svg/icons/minus.svg';

interface Props {
    children?: React.ReactElement;
    registeredFiles: Immutable.Map<string, model.FileInfo>;
    database: AsyncDuckDB | null;

    closeOverlay: () => void;
    addLocalFiles: (files: FileList) => void;
}

class FileExplorer extends React.Component<Props> {
    /// The input element
    protected _inputElement: React.RefObject<HTMLInputElement>;
    /// The file selection changed
    protected _fileSelectionChanged = this.fileSelectionChanged.bind(this);
    /// Select a file
    protected _selectFile = this.selectFile.bind(this);

    /// Constructor
    constructor(props: Props) {
        super(props);
        this._inputElement = React.createRef();
    }

    /// Trigger the file selection
    protected selectFile() {
        // Click the input element
        this._inputElement.current?.click();
    }

    /// Did the file selection change?
    protected fileSelectionChanged(e: ChangeEvent<HTMLInputElement>) {
        this.props.addLocalFiles(e.target.files as FileList);
    }

    /// Render a loaded entry
    protected renderLoadedFileEntry(metadata: model.FileInfo) {
        return (
            <div key={metadata.name} className={styles.file_list_entry}>
                <div className={styles.file_list_entry_name}>{metadata.name}</div>
                <div className={styles.file_list_entry_size}>{formatBytes(metadata.size || 0)}</div>
                <div
                    className={classNames(styles.file_list_entry_action, {
                        [styles.file_list_entry_action_toggled]: true,
                    })}
                >
                    <svg width="18px" height="18px">
                        <use xlinkHref={`${icon_data_matrix_scan}#sym`} />
                    </svg>
                </div>
                <div className={styles.file_list_entry_action}>
                    <svg width="20px" height="20px">
                        <use xlinkHref={`${icon_minus}#sym`} />
                    </svg>
                </div>
            </div>
        );
    }

    /// Render the file explorer
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
                <div className={styles.file_list}>
                    {this.props.registeredFiles
                        .toArray()
                        .map((entry: [string, model.FileInfo]) => this.renderLoadedFileEntry(entry[1]))}
                    {this.props.registeredFiles.size == 0 && <div className={styles.no_files}>No files registered</div>}
                </div>
                <div className={styles.footer_actions}>
                    <Button className={styles.footer_action} variant="primary" size="sm" onClick={this._selectFile}>
                        <input
                            ref={this._inputElement}
                            onChange={this._fileSelectionChanged}
                            type="file"
                            style={{ display: 'none' }}
                        />
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
