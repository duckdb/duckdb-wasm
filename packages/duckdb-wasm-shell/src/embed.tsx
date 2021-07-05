import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as model from './model';
import { Provider as ReduxProvider } from 'react-redux';
import Shell from './shell';

import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb.module.js';

export interface EmbeddableShellProps {
    resolveDatabase: () => Promise<duckdb.AsyncDuckDB>;
    backgroundColor?: string;
    padding?: number[];
    borderRadius?: number[];
}

export class EmbeddableShell extends React.Component<EmbeddableShellProps, model.AppReduxStore> {
    constructor(props: EmbeddableShellProps) {
        super(props);
        this.state = model.createStore();
    }

    public render(): JSX.Element {
        return (
            <ReduxProvider store={this.state}>
                <Shell
                    resolveDatabase={this.props.resolveDatabase}
                    padding={this.props.padding}
                    backgroundColor={this.props.backgroundColor}
                    borderRadius={this.props.borderRadius}
                />
            </ReduxProvider>
        );
    }
}

export function embed(target: HTMLElement, props: EmbeddableShellProps): void {
    ReactDOM.render(
        <EmbeddableShell
            resolveDatabase={props.resolveDatabase}
            padding={props.padding}
            backgroundColor={props.backgroundColor}
            borderRadius={props.borderRadius}
        />,
        target,
    );
}

export default EmbeddableShell;
