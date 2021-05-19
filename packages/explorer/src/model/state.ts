import * as arrow from 'apache-arrow';

export interface AppState {
    /// The launch is complete?
    script: string;
    /// The tokens within the script for syntax highlighting
    scriptTokens: Array<any>;
    /// The current result table (if any)
    queryResult: arrow.Table | null;
    /// The files (if any)
    files: string[];
}

export function createDefaultState(): AppState {
    return {
        script: 'select v::INTEGER from generate_series(1, 10000) t(v)',
        scriptTokens: [],
        queryResult: null,
        files: [],
    };
}
