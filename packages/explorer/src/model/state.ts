import * as arrow from 'apache-arrow';

export interface AppState {
    /// The launch is complete?
    script: string;
    /// The tokens within the script for syntax highlighting
    scriptTokens: Array<any>;
    /// The current result table (if any)
    queryResult: arrow.Table | null;
}

export function createDefaultState(): AppState {
    return {
        script: 'foo',
        scriptTokens: [],
        queryResult: null,
    };
}
