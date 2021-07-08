import * as shell from '../../crate/pkg';
import * as model from '../model';
import { AppState } from './state';
import { OverlayContent } from './overlay';

/// A mutation
export type StateMutation<T, P> = {
    readonly type: T;
    readonly data: P;
};

/// A mutation type
export enum StateMutationType {
    OVERLAY_OPEN = 'OVERLAY_OPEN',
    OVERLAY_CLOSE = 'OVERLAY_CLOSE',
    UPDATE_FILE_INFO = 'UPDATE_FILE_INFO',
    REGISTER_FILES = 'REGISTER_FILES',
    OTHER = 'OTHER',
}

/// An state mutation variant
export type StateMutationVariant =
    | StateMutation<StateMutationType.OVERLAY_OPEN, OverlayContent>
    | StateMutation<StateMutationType.OVERLAY_CLOSE, OverlayContent>
    | StateMutation<StateMutationType.UPDATE_FILE_INFO, Partial<model.FileInfo>>
    | StateMutation<StateMutationType.REGISTER_FILES, model.FileInfo[]>;

// The action dispatch
export type Dispatch = (mutation: StateMutationVariant) => void;
/// Mutation of the application state
export class AppStateMutation {
    /// Set the editor program
    public static reduce(state: AppState, mutation: StateMutationVariant): AppState {
        switch (mutation.type) {
            case StateMutationType.OVERLAY_CLOSE:
                switch (mutation.data) {
                    case model.OverlayContent.FILE_EXPLORER:
                        shell.resumeAfterInput(shell.ShellInputContext.FileInput);
                }
                return {
                    ...state,
                    overlay: null,
                };
            case StateMutationType.OVERLAY_OPEN:
                return {
                    ...state,
                    overlay: mutation.data,
                };
            case StateMutationType.UPDATE_FILE_INFO:
                return {
                    ...state,
                    registeredFiles: state.registeredFiles.withMutations(m => {
                        const info = m.get(mutation.data.name!);
                        if (info) {
                            m.set(mutation.data.name!, {
                                ...info,
                                ...mutation.data,
                            });
                        } else {
                            m.set(mutation.data.name!, {
                                name: mutation.data.name!,
                                url: null,
                                size: null,
                                fileStatsEnabled: false,
                                ...mutation.data,
                            });
                        }
                    }),
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
        }
    }
}
