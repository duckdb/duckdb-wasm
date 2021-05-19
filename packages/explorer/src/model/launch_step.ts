import * as Immutable from 'immutable';

/// Status code
export enum Status {
    NONE,
    RUNNING,
    BLOCKED,
    FAILED,
    COMPLETED,
}

/// A launch step
export enum LaunchStep {
    INIT_DUCKDB = 2,
    FETCH_EXAMPLE_DATA = 3,
}

/// A launch step info
export interface LaunchStepInfo {
    /// The label
    label: string;
    /// The status
    status: Status;
    /// The time when the step started
    startedAt: Date | null;
    /// The time when the step finished
    lastUpdateAt: Date | null;
    /// The error (if any)
    error: string | null;
}

export const DEFAULT_LAUNCH_STEPS = [LaunchStep.INIT_DUCKDB, LaunchStep.FETCH_EXAMPLE_DATA];

export function createLaunchSteps(): Immutable.Map<LaunchStep, LaunchStepInfo> {
    return Immutable.Map([
        [
            LaunchStep.INIT_DUCKDB,
            {
                label: 'Initialize the database',
                status: Status.NONE,
                startedAt: null,
                lastUpdateAt: null,
                error: null,
            },
        ],
        [
            LaunchStep.FETCH_EXAMPLE_DATA,
            {
                label: 'Initialize the database',
                status: Status.NONE,
                startedAt: null,
                lastUpdateAt: null,
                error: null,
            },
        ],
    ]);
}
