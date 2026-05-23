// Enum representing the different statuses of a Resolvable
/**
 * Enum representing the different statuses of an async operation
 */
export enum ResolvableStatus {
    NONE,
    RUNNING,
    FAILED,
    COMPLETED,
}

/**
 * Utility class for managing asynchronous operations with status, value, error, and progress
 */
export class Resolvable<Value, Progress = null, Error = string> {
    constructor(
        public readonly status: ResolvableStatus = ResolvableStatus.NONE,
        public readonly value: Value | null = null,
        public readonly error: Error | null = null,
        public readonly progress: Progress | null = null,
    ) {}

    /**
     * Method to check if the async operation is currently resolving (status is not NONE)
     */
    get isResolving(): boolean {
        return this.status !== ResolvableStatus.NONE;
    }

    /**
     * Method to create a new async instance with a COMPLETED status and the provided value and progress
     * @param value - The value to set for the completed async operation
     * @param progress - Optional progress value to set for the completed async operation
     * @returns A new async instance with a COMPLETED status
     */
    completeWith(value: Value, progress: Progress | null = null): Resolvable<Value, Progress, Error> {
        return new Resolvable(ResolvableStatus.COMPLETED, value, this.error, progress);
    }

    /**
     * Method to create a new async instance with a FAILED status and the provided error and progress
     * @param error - The error to set for the failed async operation
     * @param progress - Optional progress value to set for the failed async operation
     * @returns A new async instance with a FAILED status
     */
    failWith(error: Error, progress: Progress | null = null): Resolvable<Value, Progress, Error> {
        return new Resolvable(ResolvableStatus.FAILED, this.value, error, progress);
    }

    /**
     * Method to create a new async instance with a RUNNING status and the provided progress
     * @param progress - Optional progress value to set for the running async operation
     * @returns A new async instance with a RUNNING status
     */
    updateRunning(progress: Progress | null = null): Resolvable<Value, Progress, Error> {
        return new Resolvable(ResolvableStatus.RUNNING, this.value, this.error, progress);
    }
}
