import React from 'react';

import * as shell from '../crate/pkg';
import styles from './shell.module.css';
import 'xterm/css/xterm.css';

interface Props {
    workerURL?: string;

    backgroundColor?: string;
    padding?: number[];
    borderRadius?: number[];
}

class Shell extends React.Component<Props> {
    /// The terminal container
    protected termContainer: React.RefObject<HTMLDivElement>;

    /// Constructor
    constructor(props: Props) {
        super(props);
        this.termContainer = React.createRef();
    }

    /// Render the demo
    public render(): React.ReactElement {
        const style: React.CSSProperties = {
            padding: this.props.padding ? `${this.props.padding.map(p => `${p}px`).join(' ')}` : '0px',
            borderRadius: this.props.borderRadius ? `${this.props.borderRadius.map(p => `${p}px`).join(' ')}` : '0px',
            backgroundColor: this.props.backgroundColor || 'transparent',
        };
        return (
            <div className={styles.root} style={style}>
                <div ref={this.termContainer} className={styles.term_container}></div>
            </div>
        );
    }

    public componentDidMount(): void {
        if (this.termContainer.current != null) {
            shell.embed(this.termContainer.current);
            // TODO Instantiate the wasm module
        }
    }

    public componentWillUnmount(): void {}
}

export default Shell;
