import Immutable from 'immutable';
import * as arrow from 'apache-arrow';
import { AppConfig, createDefaultConfig } from './config';
import { Script } from './script';
import { LaunchStep, LaunchStepInfo, createLaunchSteps } from './launch_step';
import { FileInfo } from './files';
import { FileMetadata } from '../data';

export interface AppState {
    /// The config
    config: AppConfig;
    /// Is the launch complete?
    launchComplete: boolean;
    /// The launch progress
    launchSteps: Immutable.Map<LaunchStep, LaunchStepInfo>;
    /// The current script
    currentScript: Script;
    /// The current query result table
    currentQueryResult: arrow.Table | null;
    /// The script library
    scriptLibrary: Immutable.Map<string, Script>;
    /// The peeked script
    peekedScript: string | null;
    /// The registered files
    registeredFiles: Immutable.Map<string, FileInfo>;
    /// The recommended files
    recommendedFiles: FileMetadata[];
}

export function createDefaultState(config = createDefaultConfig()): AppState {
    return {
        config,
        launchComplete: false,
        launchSteps: createLaunchSteps(),
        currentScript: {
            name: 'HelloDuckDB.sql',
            text: '',
            tokens: [],
        },
        currentQueryResult: null,
        scriptLibrary: Immutable.Map(),
        peekedScript: null,
        registeredFiles: Immutable.Map(),
        recommendedFiles: [],
    };
}
