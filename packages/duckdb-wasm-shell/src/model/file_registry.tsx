import React from 'react';
import Immutable from 'immutable';
import { Action, Dispatch } from './model_context';

export interface FileInfo {
    /// The file name
    name: string;
    /// The url
    url: string | null;
    /// The size (if known)
    size: number | null;
    /// The file statistics
    fileStatsEnabled: boolean;
}

export type FileInfoUpdate = Partial<FileInfo> & { name: string };

export interface FileRegistry {
    files: Immutable.Map<string, FileInfo>;
}

export const initialFileRegistry: FileRegistry = {
    files: Immutable.Map<string, FileInfo>(),
};

export const UPDATE_FILE_INFO = Symbol('UPDATE_FILE_INFO');
export const REGISTER_FILES = Symbol('REGISTER_FILES');

export type FileRegistryAction =
    | Action<typeof UPDATE_FILE_INFO, FileInfoUpdate>
    | Action<typeof REGISTER_FILES, FileInfo[]>;

export const reduceFileRegistry = (state: FileRegistry, action: FileRegistryAction): FileRegistry => {
    switch (action.type) {
        case UPDATE_FILE_INFO:
            return {
                ...state,
                files: state.files.withMutations(m => {
                    const info = m.get(action.data.name!);
                    if (info) {
                        m.set(action.data.name!, {
                            ...info,
                            ...action.data,
                        });
                    } else {
                        m.set(action.data.name!, {
                            url: null,
                            size: null,
                            fileStatsEnabled: false,
                            ...action.data,
                        });
                    }
                }),
            };
        case REGISTER_FILES:
            return {
                ...state,
                files: state.files.withMutations(m => {
                    for (const file of action.data) {
                        m.set(file.name, file);
                    }
                }),
            };
    }
};

const fileRegistryCtx = React.createContext<FileRegistry>(initialFileRegistry);
const fileRegistryDispatchCtx = React.createContext<Dispatch<FileRegistryAction>>(() => {});

type Props = {
    children: React.ReactElement;
};

export const FileRegistryProvider: React.FC<Props> = (props: Props) => {
    const [s, d] = React.useReducer(reduceFileRegistry, initialFileRegistry);
    return (
        <fileRegistryCtx.Provider value={s}>
            <fileRegistryDispatchCtx.Provider value={d}>{props.children}</fileRegistryDispatchCtx.Provider>
        </fileRegistryCtx.Provider>
    );
};

export const useFileRegistry = (): FileRegistry => React.useContext(fileRegistryCtx);
export const useFileRegistryDispatch = (): Dispatch<FileRegistryAction> => React.useContext(fileRegistryDispatchCtx);
