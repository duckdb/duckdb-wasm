export interface AppState {
    /// The launch is complete?
    script: string;
}

export function createDefaultState(): AppState {
    return {
        script: '',
    };
}
