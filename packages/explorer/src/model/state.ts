import Immutable from 'immutable';
import * as arrow from 'apache-arrow';
import { AppConfig, createDefaultConfig } from './config';
import { Script } from './script';
import { LaunchStep, LaunchStepInfo, createLaunchSteps } from './launch_step';
import { FileInfo } from './files';

export interface AppState {
    /// The config
    config: AppConfig;
    /// Is the launch complete?
    launchComplete: boolean;
    /// The launch progress
    launchSteps: Immutable.Map<LaunchStep, LaunchStepInfo>;
    /// The script
    script: Script | null;
    /// The current result table (if any)
    queryResult: arrow.Table | null;
    /// The files (if any)
    registeredFiles: Immutable.Map<string, FileInfo>;
}

export function createDefaultState(config = createDefaultConfig()): AppState {
    return {
        config,
        launchComplete: false,
        launchSteps: createLaunchSteps(),
        script: null,
        queryResult: null,
        registeredFiles: Immutable.Map(),
    };
}
