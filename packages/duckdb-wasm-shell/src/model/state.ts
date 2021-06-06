import Immutable from 'immutable';
import { FileInfo } from './files';
import { OverlayContent } from './overlay';

export interface AppState {
    /// The overlay
    overlay: OverlayContent | null;
    /// The registered files
    registeredFiles: Immutable.Map<string, FileInfo>;
}

export function createDefaultState(): AppState {
    return {
        overlay: null,
        registeredFiles: Immutable.Map(),
    };
}
