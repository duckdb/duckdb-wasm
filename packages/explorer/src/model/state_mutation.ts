import * as arrow from 'apache-arrow';
import { AppState } from './state';
import { FileInfo } from './files';
import { LaunchStep, Status } from './launch_step';
import { Script } from './script';

/// A mutation
export type StateMutation<T, P> = {
    readonly type: T;
    readonly data: P;
};

/// A mutation type
export enum StateMutationType {
    UPDATE_LAUNCH_STEP = 'UPDATE_LAUNCH_STEP',
    SET_CURRENT_SCRIPT = 'SET_CURRENT_SCRIPT',
    SET_CURRENT_QUERY_RESULT = 'SET_CURRENT_QUERY_RESULT',
    SET_PEEKED_SCRIPT = 'SET_PEEKED_SCRIPT',
    CLEAR_PEEKED_SCRIPT = 'CLEAR_PEEKED_SCRIPT',
    REGISTER_LIBRARY_SCRIPT = 'REGISTER_LIBRARY_SCRIPT',
    REGISTER_FILES = 'REGISTER_FILES',
    MARK_LAUNCH_COMPLETE = 'MARK_LAUNCH_COMPLETE',
    OTHER = 'OTHER',
}

/// An state mutation variant
export type StateMutationVariant =
    | StateMutation<StateMutationType.UPDATE_LAUNCH_STEP, [LaunchStep, Status, string | null]>
    | StateMutation<StateMutationType.MARK_LAUNCH_COMPLETE, null>
    | StateMutation<StateMutationType.SET_CURRENT_SCRIPT, Script>
    | StateMutation<StateMutationType.SET_CURRENT_QUERY_RESULT, arrow.Table>
    | StateMutation<StateMutationType.SET_PEEKED_SCRIPT, Script>
    | StateMutation<StateMutationType.CLEAR_PEEKED_SCRIPT, null>
    | StateMutation<StateMutationType.REGISTER_LIBRARY_SCRIPT, Script>
    | StateMutation<StateMutationType.REGISTER_FILES, FileInfo[]>;

// The action dispatch
export type Dispatch = (mutation: StateMutationVariant) => void;
// Mutate the store
export function mutate(dispatch: Dispatch, m: StateMutationVariant): void {
    return dispatch(m);
}
/// Mutation of the application state
export class AppStateMutation {
    /// Set the editor program
    public static reduce(state: AppState, mutation: StateMutationVariant): AppState {
        switch (mutation.type) {
            case StateMutationType.SET_CURRENT_SCRIPT:
                return {
                    ...state,
                    currentScript: mutation.data,
                    currentQueryResult: null,
                };
            case StateMutationType.SET_CURRENT_QUERY_RESULT:
                return {
                    ...state,
                    currentQueryResult: mutation.data,
                };
            case StateMutationType.SET_PEEKED_SCRIPT:
                return {
                    ...state,
                    peekedScript: mutation.data.name,
                };
            case StateMutationType.CLEAR_PEEKED_SCRIPT:
                return {
                    ...state,
                    peekedScript: null,
                };
            case StateMutationType.REGISTER_LIBRARY_SCRIPT:
                return {
                    ...state,
                    scriptLibrary: state.scriptLibrary.set(mutation.data.name, mutation.data),
                };
            case StateMutationType.REGISTER_FILES:
                return {
                    ...state,
                    registeredFiles: state.registeredFiles.withMutations(m => {
                        for (const file of mutation.data) {
                            m.set(file.name, file);
                        }
                    }),
                };
            case StateMutationType.UPDATE_LAUNCH_STEP: {
                const [step, status, error] = mutation.data;
                const steps = state.launchSteps.withMutations(s => {
                    const info = s.get(step);
                    const now = new Date();
                    if (!info) return;
                    s.set(step, {
                        ...info,
                        startedAt: info.startedAt || now,
                        lastUpdateAt: now,
                        status: status,
                        error: error,
                    });
                });
                return {
                    ...state,
                    launchSteps: steps,
                };
            }
            case StateMutationType.MARK_LAUNCH_COMPLETE: {
                return {
                    ...state,
                    launchComplete: true,
                };
            }
        }
    }
}
