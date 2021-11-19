import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { FileRegistryProvider, StaticOverlayProvider } from './model';
import { Shell } from './pages/shell';

import * as duckdb from '@duckdb/duckdb-wasm';

export interface EmbeddableShellProps {
    resolveDatabase: () => Promise<duckdb.AsyncDuckDB>;
    backgroundColor?: string;
    padding?: number[];
    borderRadius?: number[];
}

export const EmbeddableShell: React.FC<EmbeddableShellProps> = (props: EmbeddableShellProps) => (
    <FileRegistryProvider>
        <StaticOverlayProvider>
            <Shell
                resolveDatabase={props.resolveDatabase}
                padding={props.padding}
                backgroundColor={props.backgroundColor}
                borderRadius={props.borderRadius}
            />
        </StaticOverlayProvider>
    </FileRegistryProvider>
);

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
