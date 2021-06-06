import Immutable from 'immutable';
import { FileInfo } from './files';
import { OverlayContent } from './overlay';

export interface AppState {
    overlay: OverlayContent | null;
    files: Immutable.Map<string, FileInfo>;
}

export function createDefaultState(): AppState {
    return {
        overlay: null,
        files: Immutable.Map(),
    };
}
