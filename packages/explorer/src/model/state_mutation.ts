import { AppState, createDefaultState } from './state';

/// A mutation
export type StateMutation<T, P> = {
    readonly type: T;
    readonly data: P;
};

/// A mutation type
export enum StateMutationType {
    UPDATE_SCRIPT = 'UPDATE_SCRIPT',
    OTHER = 'OTHER',
}

/// An state mutation variant
export type StateMutationVariant = StateMutation<StateMutationType.UPDATE_SCRIPT, string>;

// The action dispatch
export type Dispatch = (mutation: StateMutationVariant) => void;
// Mutate the store
export function mutate(dispatch: Dispatch, m: StateMutationVariant): void {
    return dispatch(m);
}
/// Mutation of the application state
export class AppStateMutation {
    /// Set the editor program
    public static reduce(state: AppState = createDefaultState(), mutation: StateMutationVariant): AppState {
        switch (mutation.type) {
            case StateMutationType.UPDATE_SCRIPT:
                return {
                    ...state,
                    script: mutation.data,
                };
        }
        return state;
    }
}
