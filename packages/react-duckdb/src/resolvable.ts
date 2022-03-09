export enum ResolvableStatus {
    NONE,
    RUNNING,
    FAILED,
    COMPLETED,
}

export type Resolver<Value> = () => Promise<Value | null>;

export class Resolvable<Value, Progress = null, Error = string> {
    public readonly status: ResolvableStatus;
    public readonly value: Value | null;
    public readonly error: Error | null;
    public readonly progress: Progress | null;

    constructor(status?: ResolvableStatus, value?: Value | null, error?: Error | null, progress?: Progress | null) {
        this.status = status || ResolvableStatus.NONE;
        this.value = value || null;
        this.error = error || null;
        this.progress = progress || null;
    }

    public resolving(): boolean {
        return this.status != ResolvableStatus.NONE;
    }
    public completeWith(value: Value, progress: Progress | null = null): Resolvable<Value, Progress, Error> {
        return new Resolvable(ResolvableStatus.COMPLETED, value, this.error, progress);
    }
    public failWith(error: Error, progress: Progress | null = null): Resolvable<Value, Progress, Error> {
        return new Resolvable(ResolvableStatus.FAILED, this.value, error, progress);
    }
    public updateRunning(progress: Progress | null = null): Resolvable<Value, Progress, Error> {
        return new Resolvable(ResolvableStatus.RUNNING, this.value, this.error, progress);
    }
}
