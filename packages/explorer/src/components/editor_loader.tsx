import * as React from 'react';
import { RectangleWaveSpinner } from './spinners';
import classnames from 'classnames';

import styles from './editor_loader.module.css';

interface Props {
    className?: string;
}

function loadingSpinner(props: Props) {
    return (
        <div className={classnames(styles.editor_loader, props.className)}>
            <RectangleWaveSpinner active={true} />
        </div>
    );
}

const Editor = React.lazy(() => import('./editor'));

export default class EditorLoader extends React.Component<Props> {
    public render(): React.ReactElement {
        return (
            <React.Suspense fallback={loadingSpinner(this.props)}>
                <Editor {...this.props} />
            </React.Suspense>
        );
    }
}
