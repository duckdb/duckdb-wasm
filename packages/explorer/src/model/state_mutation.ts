import * as arrow from 'apache-arrow';
import { AppState } from './state';
import { LaunchStep, Status } from './launch_step';
import { Script } from './script';
import { FileInfo } from './files';

/// A mutation
export type StateMutation<T, P> = {
    readonly type: T;
    readonly data: P;
};

/// A mutation type
export enum StateMutationType {
    UPDATE_SCRIPT = 'UPDATE_SCRIPT',
    UPDATE_LAUNCH_STEP = 'UPDATE_LAUNCH_STEP',
    SET_QUERY_RESULT = 'SET_QUERY_RESULT',
    REGISTER_FILES = 'REGISTER_FILES',
    MARK_LAUNCH_COMPLETE = 'MARK_LAUNCH_COMPLETE',
    OTHER = 'OTHER',
}

/// An state mutation variant
export type StateMutationVariant =
    | StateMutation<StateMutationType.UPDATE_SCRIPT, Script>
    | StateMutation<StateMutationType.UPDATE_LAUNCH_STEP, [LaunchStep, Status, string | null]>
    | StateMutation<StateMutationType.SET_QUERY_RESULT, arrow.Table>
    | StateMutation<StateMutationType.REGISTER_FILES, FileInfo[]>
    | StateMutation<StateMutationType.MARK_LAUNCH_COMPLETE, null>;

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
            case StateMutationType.UPDATE_SCRIPT:
                return {
                    ...state,
                    script: mutation.data,
                };
            case StateMutationType.SET_QUERY_RESULT:
                return {
                    ...state,
                    queryResult: mutation.data,
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
