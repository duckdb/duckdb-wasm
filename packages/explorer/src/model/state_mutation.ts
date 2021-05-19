import * as arrow from 'apache-arrow';
import { AppState, createDefaultState } from './state';

/// A mutation
export type StateMutation<T, P> = {
    readonly type: T;
    readonly data: P;
};

/// A mutation type
export enum StateMutationType {
    UPDATE_SCRIPT = 'UPDATE_SCRIPT',
    SET_QUERY_RESULT = 'SET_QUERY_RESULT',
    OTHER = 'OTHER',
}

/// An state mutation variant
export type StateMutationVariant =
    | StateMutation<StateMutationType.UPDATE_SCRIPT, [string, any[]]>
    | StateMutation<StateMutationType.SET_QUERY_RESULT, arrow.Table>;

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
                    script: mutation.data[0],
                    scriptTokens: mutation.data[1],
                };
            case StateMutationType.SET_QUERY_RESULT:
                return {
                    ...state,
                    queryResult: mutation.data,
                };
        }
        return state;
    }
}
