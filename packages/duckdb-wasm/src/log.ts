export enum LogLevel {
    NONE = 0,
    DEBUG = 1,
    INFO = 2,
    WARNING = 3,
    ERROR = 4,
}

export enum LogTopic {
    NONE = 0,
    CONNECT = 1,
    DISCONNECT = 2,
    OPEN = 3,
    QUERY = 4,
    INSTANTIATE = 5,
}

export enum LogEvent {
    NONE = 0,
    OK = 1,
    ERROR = 2,
    START = 3,
    RUN = 4,
    CAPTURE = 5,
}

export enum LogOrigin {
    NONE = 0,
    WEB_WORKER = 1,
    NODE_WORKER = 2,
    BINDINGS = 3,
    ASYNC_DUCKDB = 4,
}

export type LogEntry<O, T, E, V> = {
    readonly timestamp: Date;
    readonly level: LogLevel;
    readonly origin: O;
    readonly topic: T;
    readonly event: E;
    readonly value: V;
};

export type ProgressEntry = {
    readonly status: string;
    readonly percentage: string;
    readonly repetitions: string;
}

/** An execution progress handler */
export type ExecutionProgressHandler = (p: ProgressEntry) => void;

export type LogEntryVariant =
    | LogEntry<LogOrigin.BINDINGS, LogTopic.INSTANTIATE, LogEvent.ERROR, string>
    | LogEntry<LogOrigin.BINDINGS, LogTopic.QUERY, LogEvent.START, void>
    | LogEntry<LogOrigin.BINDINGS, LogTopic.QUERY, LogEvent.OK, void>
    | LogEntry<LogOrigin.BINDINGS, LogTopic.QUERY, LogEvent.ERROR, void>
    | LogEntry<LogOrigin.BINDINGS, LogTopic.CONNECT, LogEvent.OK, void>
    | LogEntry<LogOrigin.BINDINGS, LogTopic.CONNECT, LogEvent.ERROR, void>
    | LogEntry<LogOrigin.BINDINGS, LogTopic.DISCONNECT, LogEvent.OK, void>
    | LogEntry<LogOrigin.BINDINGS, LogTopic.DISCONNECT, LogEvent.ERROR, void>
    | LogEntry<LogOrigin.BINDINGS, LogTopic.OPEN, LogEvent.START, void>
    | LogEntry<LogOrigin.BINDINGS, LogTopic.OPEN, LogEvent.OK, void>
    | LogEntry<LogOrigin.BINDINGS, LogTopic.OPEN, LogEvent.ERROR, void>
    | LogEntry<LogOrigin.ASYNC_DUCKDB, LogTopic.QUERY, LogEvent.RUN, string>;

export interface Logger {
    log(entry: LogEntryVariant): void;
}

export class VoidLogger implements Logger {
    public log(_entry: LogEntryVariant): void {}
}

export class ConsoleLogger implements Logger {
    constructor(protected level: LogLevel = LogLevel.INFO) {}
    public log(entry: LogEntryVariant): void {
        if (entry.level >= this.level) {
            console.log(entry);
        }
    }
}

export function getLogLevelLabel(level: LogLevel): string {
    switch (level) {
        case LogLevel.NONE:
            return 'NONE';
        case LogLevel.DEBUG:
            return 'DEBUG';
        case LogLevel.INFO:
            return 'INFO';
        case LogLevel.WARNING:
            return 'WARNING';
        case LogLevel.ERROR:
            return 'ERROR';
        default:
            return '?';
    }
}

export function getLogEventLabel(event: LogEvent): string {
    switch (event) {
        case LogEvent.NONE:
            return 'NONE';
        case LogEvent.OK:
            return 'OK';
        case LogEvent.ERROR:
            return 'ERROR';
        case LogEvent.START:
            return 'START';
        case LogEvent.RUN:
            return 'RUN';
        case LogEvent.CAPTURE:
            return 'CAPTURE';
        default:
            return '?';
    }
}

export function getLogTopicLabel(topic: LogTopic): string {
    switch (topic) {
        case LogTopic.CONNECT:
            return 'CONNECT';
        case LogTopic.DISCONNECT:
            return 'DISCONNECT';
        case LogTopic.INSTANTIATE:
            return 'INSTANTIATE';
        case LogTopic.OPEN:
            return 'OPEN';
        case LogTopic.QUERY:
            return 'QUERY';
        default:
            return '?';
    }
}

export function getLogOriginLabel(origin: LogOrigin): string {
    switch (origin) {
        case LogOrigin.NONE:
            return 'NONE';
        case LogOrigin.WEB_WORKER:
            return 'WEB WORKER';
        case LogOrigin.NODE_WORKER:
            return 'NODE WORKER';
        case LogOrigin.BINDINGS:
            return 'DUCKDB BINDINGS';
        case LogOrigin.ASYNC_DUCKDB:
            return 'DUCKDB';
        default:
            return '?';
    }
}
