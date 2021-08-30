import React from 'react';
import { Action, Dispatch } from './model_context';
import * as shell from '../../crate/pkg';

export enum StaticOverlay {
    FILE_EXPLORER,
}

export const SHOW_OVERLAY = Symbol('SHOW_OVERLAY');
export const CLOSE_OVERLAY = Symbol('CLOSE_OVERLAY');

export type StaticOverlayAction = Action<typeof SHOW_OVERLAY, StaticOverlay> | Action<typeof CLOSE_OVERLAY, null>;

const reducer = (state: StaticOverlay | null, action: StaticOverlayAction) => {
    switch (action.type) {
        case SHOW_OVERLAY:
            return action.data;

        case CLOSE_OVERLAY: {
            switch (state) {
                case StaticOverlay.FILE_EXPLORER:
                    shell.resumeAfterInput(shell.ShellInputContext.FileInput);
                    break;
            }
            return null;
        }
        default:
            return state;
    }
};

const staticOverlayCtx = React.createContext<StaticOverlay | null>(null);
const staticOverlaySetterCtx = React.createContext<Dispatch<StaticOverlayAction>>(() => {});

type Props = {
    children: React.ReactElement;
};

export const StaticOverlayProvider: React.FC<Props> = (props: Props) => {
    const [overlay, overlayDispatch] = React.useReducer(reducer, null);
    return (
        <staticOverlayCtx.Provider value={overlay}>
            <staticOverlaySetterCtx.Provider value={overlayDispatch}>{props.children}</staticOverlaySetterCtx.Provider>
        </staticOverlayCtx.Provider>
    );
};

export const useStaticOverlay = (): StaticOverlay | null => React.useContext(staticOverlayCtx);
export const useStaticOverlaySetter = (): Dispatch<StaticOverlayAction> => React.useContext(staticOverlaySetterCtx);
