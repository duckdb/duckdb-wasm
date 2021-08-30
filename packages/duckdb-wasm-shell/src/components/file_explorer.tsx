import * as model from '../model';
import * as shell from '../../crate/pkg';
import Button from 'react-bootstrap/Button';
import React, { ChangeEvent } from 'react';
import classNames from 'classnames';
import styles from './file_explorer.module.css';
import { formatBytes } from '../utils/format';

import icon_close from '../../static/svg/icons/close.svg';
import icon_data_matrix_scan from '../../static/svg/icons/data-matrix-scan.svg';
import icon_minus from '../../static/svg/icons/minus.svg';

interface Props {
    children?: React.ReactElement;
    addLocalFiles: (files: FileList) => void;
}

export const FileExplorer: React.FC<Props> = (props: Props) => {
    const inputElement = React.useRef<HTMLInputElement | null>(null);
    const setOverlay = model.useStaticOverlaySetter();
    const fileRegistry = model.useFileRegistry();

    /// Render a loaded entry
    const renderLoadedFileEntry = (metadata: model.FileInfo) => {
        return (
            <div key={metadata.name} className={styles.file_list_entry}>
                <div className={styles.file_list_entry_name}>{metadata.name}</div>
                <div className={styles.file_list_entry_size}>{formatBytes(metadata.size || 0)}</div>
                <div
                    className={classNames({
                        [styles.file_list_entry_action]: !metadata.fileStatsEnabled,
                        [styles.file_list_entry_action_toggled]: metadata.fileStatsEnabled,
                    })}
                    onClick={() => shell.collectFileStatistics(metadata.name, !metadata.fileStatsEnabled)}
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
    };

    /// Close the overlay
    const closeOverlay = () =>
        setOverlay({
            type: model.CLOSE_OVERLAY,
            data: null,
        });

    /// Render the file explorer
    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <div className={styles.header_title}>Files</div>
                <div className={styles.close} onClick={closeOverlay}>
                    <svg width="20px" height="20px">
                        <use xlinkHref={`${icon_close}#sym`} />
                    </svg>
                </div>
            </div>
            <div className={styles.file_list}>
                {fileRegistry.files.toArray().map((entry: [string, model.FileInfo]) => renderLoadedFileEntry(entry[1]))}
                {fileRegistry.files.size == 0 && <div className={styles.no_files}>No files registered</div>}
            </div>
            <div className={styles.footer_actions}>
                <Button
                    className={styles.footer_action}
                    variant="primary"
                    size="sm"
                    onClick={() => inputElement.current?.click()}
                >
                    <input
                        ref={inputElement}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            props.addLocalFiles(e.target.files as FileList);
                        }}
                        type="file"
                        style={{ display: 'none' }}
                    />
                    Local File
                </Button>
                <Button className={styles.footer_action} variant="primary" size="sm" onClick={closeOverlay} disabled>
                    HTTP File
                </Button>
            </div>
        </div>
    );
};
