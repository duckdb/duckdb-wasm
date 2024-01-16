export declare enum LogLevel {
    NONE = 0,
    DEBUG = 1,
    INFO = 2,
    WARNING = 3,
    ERROR = 4
}
export declare enum LogTopic {
    NONE = 0,
    CONNECT = 1,
    DISCONNECT = 2,
    OPEN = 3,
    QUERY = 4,
    INSTANTIATE = 5
}
export declare enum LogEvent {
    NONE = 0,
    OK = 1,
    ERROR = 2,
    START = 3,
    RUN = 4,
    CAPTURE = 5
}
export declare enum LogOrigin {
    NONE = 0,
    WEB_WORKER = 1,
    NODE_WORKER = 2,
    BINDINGS = 3,
    ASYNC_DUCKDB = 4
}
export type LogEntry<O, T, E, V> = {
    readonly timestamp: Date;
    readonly level: LogLevel;
    readonly origin: O;
    readonly topic: T;
    readonly event: E;
    readonly value: V;
};
export type LogEntryVariant = LogEntry<LogOrigin.BINDINGS, LogTopic.INSTANTIATE, LogEvent.ERROR, string> | LogEntry<LogOrigin.BINDINGS, LogTopic.QUERY, LogEvent.START, void> | LogEntry<LogOrigin.BINDINGS, LogTopic.QUERY, LogEvent.OK, void> | LogEntry<LogOrigin.BINDINGS, LogTopic.QUERY, LogEvent.ERROR, void> | LogEntry<LogOrigin.BINDINGS, LogTopic.CONNECT, LogEvent.OK, void> | LogEntry<LogOrigin.BINDINGS, LogTopic.CONNECT, LogEvent.ERROR, void> | LogEntry<LogOrigin.BINDINGS, LogTopic.DISCONNECT, LogEvent.OK, void> | LogEntry<LogOrigin.BINDINGS, LogTopic.DISCONNECT, LogEvent.ERROR, void> | LogEntry<LogOrigin.BINDINGS, LogTopic.OPEN, LogEvent.START, void> | LogEntry<LogOrigin.BINDINGS, LogTopic.OPEN, LogEvent.OK, void> | LogEntry<LogOrigin.BINDINGS, LogTopic.OPEN, LogEvent.ERROR, void> | LogEntry<LogOrigin.ASYNC_DUCKDB, LogTopic.QUERY, LogEvent.RUN, string>;
export interface Logger {
    log(entry: LogEntryVariant): void;
}
export declare class VoidLogger implements Logger {
    log(_entry: LogEntryVariant): void;
}
export declare class ConsoleLogger implements Logger {
    protected level: LogLevel;
    constructor(level?: LogLevel);
    log(entry: LogEntryVariant): void;
}
export declare function getLogLevelLabel(level: LogLevel): string;
export declare function getLogEventLabel(event: LogEvent): string;
export declare function getLogTopicLabel(topic: LogTopic): string;
export declare function getLogOriginLabel(origin: LogOrigin): string;
