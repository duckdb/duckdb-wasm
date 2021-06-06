import React from 'react';
import { useDropzone, FileRejection, DropEvent } from 'react-dropzone';

import styles from './file_dropzone.module.css';

interface Props {
    onDrop: <T extends File>(acceptedFiles: T[], fileRejections: FileRejection[], event: DropEvent) => void;
}

export function FileDropzone(props: Props): React.ReactElement {
    const { getRootProps, getInputProps } = useDropzone({ onDrop: props.onDrop });
    return (
        <div {...getRootProps({ className: styles.root })}>
            <input {...getInputProps()} />
            <p>
                Drop some files here,
                <br />
                or click to select them.
            </p>
        </div>
    );
}
export default FileDropzone;
