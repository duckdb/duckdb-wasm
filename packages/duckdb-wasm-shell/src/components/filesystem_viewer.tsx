import React from 'react';
import styles from './filesystem_viewer.module.css';
import Button from 'react-bootstrap/Button';

interface Props {
    children?: React.ReactElement;
}

class FilesystemViewer extends React.Component<Props> {
    public render(): React.ReactElement {
        return (
            <div className={styles.root}>
                <div className={styles.header}>
                    <div className={styles.header_title}>Files</div>
                    <Button className={styles.header_action} variant="primary" size="sm">
                        Done
                    </Button>
                </div>
            </div>
        );
    }
}

export default FilesystemViewer;
