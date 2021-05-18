export interface AppState {
    /// The launch is complete?
    script: string;
    ///
    scriptTokens: Array<any>;
}

export function createDefaultState(): AppState {
    return {
        script: '',
        scriptTokens: [],
    };
}
