import React from 'react';
import styles from './filesystem_viewer.module.css';

interface Props {
    children?: React.ReactElement;
}

class FilesystemViewer extends React.Component<Props> {
    public render(): React.ReactElement {
        return (
            <div className={styles.root}>
                <div className={styles.header}>
                    <div className={styles.header_title}>Files</div>
                </div>
            </div>
        );
    }
}

export default FilesystemViewer;
